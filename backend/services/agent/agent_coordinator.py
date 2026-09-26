import asyncio
import concurrent.futures
import json
import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple
import uuid

from backend import config
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus, StructuredError, WorkflowStage
from backend.services.agent.agent_store import create_task, get_task, update_task_state
from backend.services.agent.agent_tool_registry import FatalToolError, RetryableToolError, ToolExecutionError, execute_tool
from backend.services.ai_inference_service import ai_inference_service
from backend.services.ai_providers.base import AIRequest
from backend.services.chart_store import list_charts_for_job
from backend.services.evidence_store import query_evidence
from backend.services.ingestion_store import get_job
from backend.services.planner_models import PlannedSection, ReportPlan, SectionType
from backend.services.planner_service import planner_service
from backend.services.planner_store import save_plan

logger = logging.getLogger("mineintel.agent_coordinator")

# Bounded timeouts and constraints approved in Phase 0.5 & Phase B
PENDING_STARTUP_DEADLINE_SEC = int(os.getenv("MINEINTEL_PENDING_STARTUP_DEADLINE_SEC", 30))
STAGE_DEADLINE_SEC = int(os.getenv("MINEINTEL_STAGE_DEADLINE_SEC", 45))
LLM_CALL_TIMEOUT_SEC = int(os.getenv("MINEINTEL_LLM_CALL_TIMEOUT_SEC", 90))
SECTION_WRITING_TIMEOUT_SEC = int(os.getenv("MINEINTEL_SECTION_WRITING_TIMEOUT_SEC", 60))
TOTAL_WALLCLOCK_DEADLINE_SEC = int(os.getenv("MINEINTEL_TOTAL_WALLCLOCK_DEADLINE_SEC", 600))  # 10 minutes
MAX_TRANSIENT_RETRIES = 2
MAX_CHUNK_CHARS = getattr(config, "MAX_CHUNK_CHARS", 8000)
MAX_EVIDENCE_ITEMS_PER_PROMPT = 5


class TaskTimeoutError(Exception):
    """Raised when the overall 10-minute task deadline is exceeded."""
    pass


class SectionTimeoutError(Exception):
    """Raised when a report section writing deadline (60s) is exceeded."""
    pass


class LLMCallTimeoutError(Exception):
    """Raised when an individual LLM call times out and exhausts retries."""
    pass


class ToolTimeoutError(Exception):
    """Raised when a deterministic tool execution exceeds its allowed stage budget."""
    pass


class AgentCoordinator:
    """
    Deterministic Workflow Engine for MineIntel Report Generation.
    Replaces the autonomous ReAct/LLM tool-selection loop with strict, code-governed stage execution.
    Code directs the workflow order; Qwen provides specialized analytical reasoning and synthesis.
    """

    def __init__(
        self,
        owner_id: str,
        overall_deadline_sec: float = TOTAL_WALLCLOCK_DEADLINE_SEC,
        section_writing_timeout_sec: float = SECTION_WRITING_TIMEOUT_SEC,
        llm_call_timeout_sec: float = LLM_CALL_TIMEOUT_SEC,
    ):
        if not owner_id:
            raise ValueError("owner_id is strictly required for AgentCoordinator isolation.")
        self.owner_id = owner_id
        self.overall_deadline_sec = float(overall_deadline_sec)
        self.section_writing_timeout_sec = float(section_writing_timeout_sec)
        self.llm_call_timeout_sec = float(llm_call_timeout_sec)
        self.task_start_time: Optional[float] = None
        self.task_deadline: Optional[float] = None

    def initialize_task(self, task_id: Optional[str] = None) -> AgentTaskState:
        """Initializes a new task state with PENDING status and startup deadline."""
        if not task_id:
            task_id = str(uuid.uuid4())

        now = int(time.time() * 1000)
        state = AgentTaskState(
            task_id=task_id,
            owner_id=self.owner_id,
            status=AgentTaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            structured_state={
                "job_id": task_id,
                "current_stage": WorkflowStage.LOAD_MANIFEST.value,
                "current_tool": None,
                "stage_started_at": now,
                "stage_deadline": now + PENDING_STARTUP_DEADLINE_SEC * 1000,
                "progress_reason": "Waiting for Agent execution to start...",
                "files_total": 0,
                "files_completed": 0,
                "chunks_total": 0,
                "chunks_completed": 0,
                "total_sections": 0,
                "sections_total": 0,
                "sections_completed": 0,
                "active_sections": [],
                "completed_sections": [],
                "retry_count": 0
            }
        )
        create_task(state.model_dump())
        return state

    def get_task_state(self, task_id: str) -> Optional[AgentTaskState]:
        """Retrieves an existing task state, strictly checking owner_id."""
        state_dict = get_task(task_id, self.owner_id)
        if state_dict:
            return AgentTaskState(**state_dict)
        return None

    def prepare_bounded_evidence_context(self, evidence_items: List[Dict[str, Any]]) -> str:
        """Prepares deterministically ordered and bounded evidence context."""
        bounded_items = evidence_items[:MAX_EVIDENCE_ITEMS_PER_PROMPT]
        snippets = []
        total_chars = 0
        for it in bounded_items:
            eid = it.get("evidence_id") or it.get("id") or "EV"
            src = (it.get("provenance") or {}).get("filename", "Doc")
            max_item_chars = max(500, MAX_CHUNK_CHARS // MAX_EVIDENCE_ITEMS_PER_PROMPT)
            content = (it.get("content_text") or "")[:max_item_chars]
            snippet = f"[Evidence {eid} | Source: {src}]:\n{content}"
            if total_chars + len(snippet) > MAX_CHUNK_CHARS and snippets:
                break
            snippets.append(snippet)
            total_chars += len(snippet)
        return "\n\n".join(snippets)

    def build_section_specific_context(
        self,
        section: Any,  # PlannedSection
        evidence_items: List[Dict[str, Any]],
        chunk_summaries: Optional[List[str]] = None,
        conflicts: Optional[List[Dict[str, Any]]] = None,
        charts: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Builds a bounded, section-specific context payload for report synthesis (Phase A: A2 & A3).
        Eliminates redundant corpus dumping while preserving:
        - Deterministic ordering
        - Source provenance and citations
        - Section-specific factual relevance
        - MAX_CHUNK_CHARS strict upper bound
        """
        ev_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}
        sec_type = getattr(section, "section_type", "") or ""
        sec_topic = getattr(section, "topic", "") or ""
        sec_ev_ids = getattr(section, "evidence_ids", []) or []

        snippets: List[str] = []
        total_chars = 0

        # 1. Executive Summary: Factual operational highlights + primary executive items
        if sec_type == SectionType.EXECUTIVE_SUMMARY.value or sec_topic == "EXECUTIVE_SUMMARY" or getattr(section, "order_index", 0) == 1:
            if chunk_summaries:
                overview_lines = [f"- {s.strip()}" for s in chunk_summaries[:3] if s and s.strip()]
                if overview_lines:
                    overview_block = "Verified Operational Highlights (from Evidence Batches):\n" + "\n".join(overview_lines)
                    snippets.append(overview_block)
                    total_chars += len(overview_block)

            # Add primary executive evidence items bound to this section
            target_ids = sec_ev_ids[:MAX_EVIDENCE_ITEMS_PER_PROMPT]
            target_items = [ev_by_id[eid] for eid in target_ids if eid in ev_by_id]
            if not target_items and evidence_items:
                target_items = evidence_items[:min(3, len(evidence_items))]

            for it in target_items:
                eid = it.get("evidence_id") or "EV"
                src = (it.get("provenance") or {}).get("filename", "Source")
                cls_name = it.get("classification", "FACT")
                content = (it.get("content_text") or "")[:600]
                snippet = f"[{cls_name}] [Evidence {eid} | Source: {src}]:\n{content}"
                if total_chars + len(snippet) > MAX_CHUNK_CHARS and snippets:
                    break
                snippets.append(snippet)
                total_chars += len(snippet)

        # 2. Statutory Compliance & Audit Discrepancies
        elif sec_type == SectionType.STATUTORY_COMPLIANCE.value or "STATUTORY" in sec_topic.upper():
            # Include specific compliance evidence items
            target_items = [ev_by_id[eid] for eid in sec_ev_ids if eid in ev_by_id][:MAX_EVIDENCE_ITEMS_PER_PROMPT]
            for it in target_items:
                eid = it.get("evidence_id") or "EV"
                src = (it.get("provenance") or {}).get("filename", "Source")
                cls_name = it.get("classification", "STATUTORY_FACT")
                content = (it.get("content_text") or "")[:700]
                snippet = f"[{cls_name}] [Evidence {eid} | Source: {src}]:\n{content}"
                if total_chars + len(snippet) > MAX_CHUNK_CHARS and snippets:
                    break
                snippets.append(snippet)
                total_chars += len(snippet)

            # Include multi-source discrepancy ledger if conflicts exist
            if conflicts:
                discrepancy_lines = []
                for c in conflicts[:4]:
                    desc = c.get("description") or c.get("field", "Data discrepancy")
                    sev = c.get("severity", "MEDIUM")
                    discrepancy_lines.append(f"- [{sev}] {desc}")
                if discrepancy_lines:
                    disc_block = "Audited Multi-Source Discrepancies & Priority Conflicts:\n" + "\n".join(discrepancy_lines)
                    if total_chars + len(disc_block) <= MAX_CHUNK_CHARS:
                        snippets.append(disc_block)
                        total_chars += len(disc_block)

            # Include missing evidence notices if registered in plan
            vnotes = getattr(section, "validation_notes", []) or []
            if vnotes:
                notes_block = "Statutory Clearance & Compliance Notes:\n" + "\n".join(f"- {n}" for n in vnotes[:3])
                if total_chars + len(notes_block) <= MAX_CHUNK_CHARS:
                    snippets.append(notes_block)
                    total_chars += len(notes_block)

        # 3. Quantitative Tables & Calculation Audits
        elif sec_type == SectionType.TABULAR_AUDIT.value or sec_type == SectionType.CHART_VISUALIZATION.value or "TABULAR" in sec_topic.upper():
            # Include only calculated and locked numerical items
            target_items = [ev_by_id[eid] for eid in sec_ev_ids if eid in ev_by_id]
            if not target_items:
                target_items = [it for it in evidence_items if it.get("classification") in ["CALCULATED_VALUE", "LOCKED_FACT"]]
            target_items = target_items[:MAX_EVIDENCE_ITEMS_PER_PROMPT]

            for it in target_items:
                eid = it.get("evidence_id") or "EV"
                src = (it.get("provenance") or {}).get("filename", "Source")
                cls_name = it.get("classification", "CALCULATED_VALUE")
                content = (it.get("content_text") or str(it.get("content_json") or ""))[:700]
                snippet = f"[{cls_name}] [Evidence {eid} | Source: {src}]:\n{content}"
                if total_chars + len(snippet) > MAX_CHUNK_CHARS and snippets:
                    break
                snippets.append(snippet)
                total_chars += len(snippet)

            # Attached charts summaries
            if charts:
                sec_charts = [c for c in charts if c.get("chart_id") in getattr(section, "chart_ids", [])]
                for c in sec_charts[:2]:
                    cfg = c.get("config", {})
                    calc = c.get("calculation", {})
                    c_title = cfg.get("title", "Operational Metric Chart")
                    formula = calc.get("aggregation_formula", "Summation")
                    chart_snippet = f"[Chart {c.get('chart_id')}: {c_title} | Metric Formula: {formula}]"
                    if total_chars + len(chart_snippet) <= MAX_CHUNK_CHARS:
                        snippets.append(chart_snippet)
                        total_chars += len(chart_snippet)

        # 4. Standard Topic-Specific Deep Dives (Coal Production, Safety, Environment, etc.)
        else:
            # Deterministically pull ONLY items bound to this section's evidence_ids
            target_items = [ev_by_id[eid] for eid in sec_ev_ids if eid in ev_by_id]

            # If section had no direct evidence_ids assigned, match by topic metadata
            if not target_items:
                target_items = [
                    it for it in evidence_items 
                    if it.get("topic") == sec_topic or (it.get("metadata") or {}).get("topic") == sec_topic
                ]

            # Strict bounded selection
            target_items = target_items[:MAX_EVIDENCE_ITEMS_PER_PROMPT]

            for it in target_items:
                eid = it.get("evidence_id") or "EV"
                src = (it.get("provenance") or {}).get("filename", "Source")
                cls_name = it.get("classification", "FACT")
                content = (it.get("content_text") or "")[:800]
                snippet = f"[{cls_name}] [Evidence {eid} | Source: {src}]:\n{content}"
                if total_chars + len(snippet) > MAX_CHUNK_CHARS and snippets:
                    break
                snippets.append(snippet)
                total_chars += len(snippet)

        # Absolute Fallback if no specific items matched (e.g., brand new custom section)
        if not snippets and evidence_items:
            order_idx = getattr(section, "order_index", 1) - 1
            slice_start = (order_idx * 2) % len(evidence_items)
            fallback_items = evidence_items[slice_start: slice_start + 2]
            for it in fallback_items:
                eid = it.get("evidence_id") or "EV"
                src = (it.get("provenance") or {}).get("filename", "Source")
                content = (it.get("content_text") or "")[:600]
                snippets.append(f"[Evidence {eid} | Source: {src}]:\n{content}")

        return "\n\n".join(snippets)

    def _check_task_deadline(self, state: AgentTaskState, stage: WorkflowStage) -> None:
        """Verifies overall task deadline. Transitions immediately if expired."""
        now = time.time()
        if self.task_deadline is not None and now >= self.task_deadline:
            elapsed = int(now - (self.task_start_time or now))
            raise TaskTimeoutError(
                f"Total task execution exceeded {self.overall_deadline_sec}s overall deadline (elapsed {elapsed}s at stage {stage.value})."
            )

    def _set_stage(
        self,
        state: AgentTaskState,
        stage: WorkflowStage,
        timeout_sec: int,
        tool: Optional[str] = None,
        progress_reason: Optional[str] = None
    ) -> None:
        """Persists current_stage and current_tool BEFORE invoking each stage/tool."""
        self._check_task_deadline(state, stage)
        now_sec = time.time()
        now = int(now_sec * 1000)
        state.updated_at = now
        state.heartbeat_at = now
        state.structured_state["current_stage"] = stage.value
        state.structured_state["current_tool"] = tool
        state.structured_state["stage_started_at"] = now

        # Derive stage deadline from absolute task deadline
        if self.task_deadline is not None:
            remaining_task_sec = max(0.0, self.task_deadline - now_sec)
            effective_stage_timeout = min(float(timeout_sec), remaining_task_sec)
            state.structured_state["stage_deadline"] = now + int(effective_stage_timeout * 1000)
            state.structured_state["task_deadline"] = int(self.task_deadline * 1000)
        else:
            state.structured_state["stage_deadline"] = now + timeout_sec * 1000

        if progress_reason:
            state.structured_state["progress_reason"] = progress_reason
        update_task_state(state.model_dump())

    def _fail_task(
        self,
        state: AgentTaskState,
        code: str,
        message: str,
        stage: WorkflowStage,
        tool: Optional[str] = None,
        retryable: bool = False
    ) -> AgentTaskState:
        """Transitions task immediately to FAILED with structured error details."""
        now = int(time.time() * 1000)
        state.status = AgentTaskStatus.FAILED
        state.updated_at = now
        state.heartbeat_at = now
        state.error = StructuredError(
            code=code,
            message=message,
            stage=stage.value,
            tool=tool,
            retryable=retryable,
            timestamp=now
        )
        state.structured_state["current_tool"] = None
        state.structured_state["final_result"] = message
        state.structured_state["error"] = state.error.model_dump()
        state.execution_history.append({
            "role": "system",
            "event": "FAILED",
            "stage": stage.value,
            "tool": tool,
            "error_code": code,
            "error_message": message,
            "timestamp": now
        })
        update_task_state(state.model_dump())
        logger.error(f"Task {state.task_id} FAILED at stage {stage.value} ({code}): {message}")
        return state

    def _execute_tool_with_state(
        self,
        state: AgentTaskState,
        stage: WorkflowStage,
        tool_name: str,
        args: Dict[str, Any],
        timeout_sec: Optional[float] = None,
        ev_count: int = 0
    ) -> Any:
        """
        Executes a deterministic tool with active bounded execution timeout,
        pre-invocation state persistence, structured instrumentation, and typed error handling.
        """
        self._check_task_deadline(state, stage)

        now_sec = time.time()
        stage_budget = timeout_sec if timeout_sec is not None else STAGE_DEADLINE_SEC
        if self.task_deadline is not None:
            remaining_task_sec = max(0.0, self.task_deadline - now_sec)
            effective_timeout = min(float(stage_budget), remaining_task_sec)
        else:
            effective_timeout = float(stage_budget)

        if effective_timeout <= 0.1:
            if self.task_deadline is not None and now_sec >= self.task_deadline:
                raise TaskTimeoutError(
                    f"Total task execution exceeded {self.overall_deadline_sec}s overall deadline before executing {tool_name} at stage {stage.value}."
                )
            else:
                raise ToolTimeoutError(
                    f"Deterministic tool '{tool_name}' exceeded stage budget before starting at stage {stage.value}."
                )

        self._set_stage(state, stage, int(effective_timeout), tool=tool_name, progress_reason=f"Executing {tool_name}...")

        start_ts = int(time.time() * 1000)
        res_count = 0
        status_code = "success"
        exception_to_raise = None

        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            future = executor.submit(execute_tool, tool_name, args, self.owner_id, state.task_id)
            result_dict = future.result(timeout=effective_timeout)
            tool_res = result_dict.get("result") if (isinstance(result_dict, dict) and "result" in result_dict) else result_dict
            if isinstance(tool_res, list):
                res_count = len(tool_res)
            elif isinstance(tool_res, dict):
                res_count = len(tool_res.get("conflicts", [])) if "conflicts" in tool_res else len(tool_res)
            else:
                res_count = 1

            state.execution_history.append({
                "role": "tool",
                "tool_name": tool_name,
                "stage": stage.value,
                "status": "success",
                "duration_ms": int(time.time() * 1000) - start_ts,
                "timestamp": int(time.time() * 1000)
            })
            return tool_res
        except concurrent.futures.TimeoutError:
            now_after = time.time()
            duration_ms = int(now_after * 1000) - start_ts
            if self.task_deadline is not None and now_after >= self.task_deadline:
                status_code = "WALLCLOCK_TIMEOUT"
                err_msg = (
                    f"Total task execution exceeded {self.overall_deadline_sec}s overall deadline "
                    f"during tool '{tool_name}' at stage {stage.value} (elapsed {int(now_after - (self.task_start_time or now_after))}s, tool duration {duration_ms}ms)."
                )
                exception_to_raise = TaskTimeoutError(err_msg)
            else:
                status_code = "STAGE_TIMEOUT"
                err_msg = (
                    f"Deterministic tool '{tool_name}' at stage {stage.value} exceeded {effective_timeout:.1f}s deadline "
                    f"(duration {duration_ms}ms)."
                )
                exception_to_raise = ToolTimeoutError(err_msg)
            raise exception_to_raise
        except ToolExecutionError as te:
            status_code = getattr(te, "code", "TOOL_ERROR")
            exception_to_raise = te
            raise
        except Exception as e:
            status_code = "TOOL_FAILED"
            exception_to_raise = e
            raise
        finally:
            end_ts = int(time.time() * 1000)
            duration_ms = end_ts - start_ts
            executor.shutdown(wait=False, cancel_futures=True)

            # Instrument Stage 4 & Stage 5 tools specifically
            if tool_name in ["get_intelligence", "detect_charts", "render_chart"]:
                logger.info(
                    f"DETERMINISTIC_STAGE_METRICS tool={tool_name} stage={stage.value} "
                    f"start_ts={start_ts} end_ts={end_ts} duration_ms={duration_ms} "
                    f"evidence_count={ev_count} result_count={res_count} code={status_code}"
                )

            # Clear current_tool immediately upon tool completion without raising in finally
            now = int(time.time() * 1000)
            state.updated_at = now
            state.heartbeat_at = now
            state.structured_state["current_tool"] = None
            update_task_state(state.model_dump())

    def _call_qwen(
        self,
        prompt: str,
        system_instruction: str,
        state: AgentTaskState,
        stage: WorkflowStage,
        max_tokens: int = 1500,
        images: Optional[List[str]] = None,
        deadline: Optional[float] = None
    ) -> str:
        """
        Calls Ollama Qwen with real bounded timeouts and maximum 2 transient retries.
        Honors both section deadline (if provided) and overall task deadline.
        """
        provider = ai_inference_service._get_provider()

        # Determine effective absolute deadline for this call
        effective_deadline = self.task_deadline
        if deadline is not None:
            if effective_deadline is not None:
                effective_deadline = min(deadline, effective_deadline)
            else:
                effective_deadline = deadline

        attempts = 0
        last_error = ""

        while attempts <= MAX_TRANSIENT_RETRIES:
            attempts += 1
            now = time.time()

            # Check if deadline is already exceeded
            if effective_deadline is not None and now >= effective_deadline:
                if self.task_deadline is not None and now >= self.task_deadline:
                    raise TaskTimeoutError(
                        f"Overall task deadline exceeded ({self.overall_deadline_sec}s) at stage {stage.value}."
                    )
                else:
                    raise SectionTimeoutError(
                        f"Section deadline exceeded ({self.section_writing_timeout_sec}s) at stage {stage.value}."
                    )

            # Compute remaining time for this attempt
            if effective_deadline is not None:
                remaining_sec = max(0.0, effective_deadline - now)
                attempt_timeout = min(self.llm_call_timeout_sec, remaining_sec)
            else:
                attempt_timeout = self.llm_call_timeout_sec

            if attempt_timeout <= 0.1:
                if self.task_deadline is not None and now >= self.task_deadline:
                    raise TaskTimeoutError(
                        f"Overall task deadline exceeded ({self.overall_deadline_sec}s) before attempt {attempts}."
                    )
                else:
                    raise SectionTimeoutError(
                        f"Section deadline exceeded ({self.section_writing_timeout_sec}s) before attempt {attempts}."
                    )

            req = AIRequest(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.1,
                max_tokens=max_tokens,
                job_id=state.task_id,
                owner_id=self.owner_id,
                images=images if (images and attempts == 1) else [],
                timeout=attempt_timeout
            )

            try:
                state.heartbeat_at = int(time.time() * 1000)
                update_task_state(state.model_dump())

                if images and attempts == 1:
                    resp = provider.generate_multimodal(req)
                else:
                    req.images = []
                    resp = provider.generate(req)

                if not resp:
                    raise RuntimeError("Null response received from AI provider.")

                # If provider timed out
                if resp.status == "timeout":
                    err_msg = resp.error or f"Ollama generation timed out after {attempt_timeout:.1f}s."
                    now_after = time.time()
                    if effective_deadline is not None and now_after >= effective_deadline:
                        if self.task_deadline is not None and now_after >= self.task_deadline:
                            raise TaskTimeoutError(
                                f"Overall task deadline exceeded ({self.overall_deadline_sec}s): {err_msg}"
                            )
                        else:
                            raise SectionTimeoutError(
                                f"Section deadline exceeded ({self.section_writing_timeout_sec}s): {err_msg}"
                            )

                    # Check remaining time budget before considering retry
                    remaining_budget = (effective_deadline - now_after) if effective_deadline else self.llm_call_timeout_sec
                    if attempts <= MAX_TRANSIENT_RETRIES and remaining_budget > 2.0:
                        last_error = err_msg
                        logger.warning(
                            f"LLM call timed out at stage {stage.value} (attempt {attempts}/{MAX_TRANSIENT_RETRIES + 1}). "
                            f"{remaining_budget:.1f}s remaining. Retrying..."
                        )
                        state.status = AgentTaskStatus.RETRYING
                        state.structured_state["retry_count"] = attempts
                        update_task_state(state.model_dump())
                        time.sleep(min(1.0, remaining_budget * 0.2))
                        state.status = AgentTaskStatus.RUNNING
                        update_task_state(state.model_dump())
                        continue
                    else:
                        raise LLMCallTimeoutError(err_msg)

                # If provider reported non-retryable failure (e.g. model unavailable)
                if resp.status == "model_unavailable":
                    raise FatalToolError(resp.error or "Local AI model is unavailable.", tool_name="ollama")

                if not resp.success:
                    err_msg = resp.error if resp.error else f"AI generation failed with status: {resp.status}"
                    raise RuntimeError(f"Ollama generation failed: {err_msg}")

                text = resp.text.strip()
                if not text:
                    raise RuntimeError("Ollama returned empty completion text.")
                return text

            except (TaskTimeoutError, SectionTimeoutError, FatalToolError, LLMCallTimeoutError):
                raise
            except Exception as e:
                last_error = str(e)
                now_after = time.time()
                logger.warning(f"Ollama call failed at stage {stage.value} (attempt {attempts}/{MAX_TRANSIENT_RETRIES + 1}): {e}")

                # Check if deadline expired during the failed attempt
                if effective_deadline is not None and now_after >= effective_deadline:
                    if self.task_deadline is not None and now_after >= self.task_deadline:
                        raise TaskTimeoutError(
                            f"Overall task deadline exceeded during error retry ({self.overall_deadline_sec}s): {e}"
                        )
                    else:
                        raise SectionTimeoutError(
                            f"Section deadline exceeded during error retry ({self.section_writing_timeout_sec}s): {e}"
                        )

                remaining_budget = (effective_deadline - now_after) if effective_deadline else self.llm_call_timeout_sec
                if attempts <= MAX_TRANSIENT_RETRIES and remaining_budget > 2.0:
                    state.status = AgentTaskStatus.RETRYING
                    state.structured_state["retry_count"] = attempts
                    update_task_state(state.model_dump())
                    time.sleep(min(1.0, remaining_budget * 0.2))
                    state.status = AgentTaskStatus.RUNNING
                    update_task_state(state.model_dump())
                else:
                    break

        raise RuntimeError(f"Ollama call exceeded {MAX_TRANSIENT_RETRIES} retries at stage {stage.value}: {last_error}")

    async def _write_section_async(
        self,
        section: Any,  # PlannedSection
        evidence_items: List[Dict[str, Any]],
        chunk_summaries: Optional[List[str]],
        conflicts: Optional[List[Dict[str, Any]]],
        charts: Optional[List[Dict[str, Any]]],
        state: AgentTaskState,
        stage: WorkflowStage,
        semaphore: asyncio.Semaphore,
        plan_title: str = "",
        state_lock: Optional[asyncio.Lock] = None,
        completed_tracker: Optional[List[int]] = None
    ) -> str:
        """
        Asynchronously synthesizes a single report section with bounded concurrency.
        Wraps blocking synchronous _call_qwen inside asyncio.to_thread.
        Maintains order-independence and handles section-level error resilience.
        """
        sec_start = time.time()
        sec_deadline = min(sec_start + self.section_writing_timeout_sec, self.task_deadline) if self.task_deadline else (sec_start + self.section_writing_timeout_sec)

        # Retrieve bounded section-specific context deterministically
        bounded_text = self.build_section_specific_context(
            section=section,
            evidence_items=evidence_items,
            chunk_summaries=chunk_summaries,
            conflicts=conflicts,
            charts=charts
        )

        section_prompt = (
            f"Write comprehensive content for section '{section.title}' of report '{plan_title}'.\n\n"
            f"Section Focus: {section.topic or section.title}\n"
            f"Relevant Grounded Evidence:\n{bounded_text or 'Refer to overall operational metrics.'}\n\n"
            f"Strict Directives:\n"
            f"1. Cite factual evidence using [EV-...] citations.\n"
            f"2. Write clear, analytical executive prose with subsections or bullet points.\n"
            f"3. Do not invent ungrounded numbers."
        )

        sec_content = ""
        async with semaphore:
            # Mark section as active under thread-safe lock
            if state_lock:
                async with state_lock:
                    active = list(state.structured_state.get("active_sections", []))
                    if section.title not in active:
                        active.append(section.title)
                    state.structured_state["active_sections"] = active
                    state.structured_state["current_section"] = section.title
                    state.heartbeat_at = int(time.time() * 1000)
                    update_task_state(state.model_dump())
            else:
                active = list(state.structured_state.get("active_sections", []))
                if section.title not in active:
                    active.append(section.title)
                state.structured_state["active_sections"] = active
                state.structured_state["current_section"] = section.title
                state.heartbeat_at = int(time.time() * 1000)
                update_task_state(state.model_dump())

            try:
                # Wrap synchronous/blocking _call_qwen inside asyncio.to_thread
                sec_content = await asyncio.to_thread(
                    self._call_qwen,
                    prompt=section_prompt,
                    system_instruction="You are an expert executive report author for the Ministry of Coal. Write analytical, strictly grounded reports.",
                    state=state,
                    stage=stage,
                    max_tokens=800,
                    images=None,
                    deadline=sec_deadline
                )
            except Exception as e:
                logger.warning(f"Section '{section.title}' synthesis encountered an error: {e}. Marking as Generation Failed.")
                sec_content = (
                    f"## {section.title}\n\n"
                    f"> ⚠️ **Generation Failed**: Section analytical generation unavailable ({e}). Audited evidence baseline displayed.\n\n"
                    f"{bounded_text or 'Grounded operational metrics and statutory evidence records apply.'}"
                )
            finally:
                # Thread-safe state update: remove from active, add to completed, update count
                if state_lock:
                    async with state_lock:
                        active = list(state.structured_state.get("active_sections", []))
                        if section.title in active:
                            active.remove(section.title)
                        state.structured_state["active_sections"] = active

                        completed = list(state.structured_state.get("completed_sections", []))
                        if section.title not in completed:
                            completed.append(section.title)
                        state.structured_state["completed_sections"] = completed

                        if completed_tracker is not None:
                            completed_tracker[0] += 1
                            state.structured_state["sections_completed"] = completed_tracker[0]
                        else:
                            curr = state.structured_state.get("sections_completed", 0)
                            state.structured_state["sections_completed"] = curr + 1
                        state.structured_state["current_section"] = section.title
                        state.heartbeat_at = int(time.time() * 1000)
                        update_task_state(state.model_dump())
                else:
                    active = list(state.structured_state.get("active_sections", []))
                    if section.title in active:
                        active.remove(section.title)
                    state.structured_state["active_sections"] = active

                    completed = list(state.structured_state.get("completed_sections", []))
                    if section.title not in completed:
                        completed.append(section.title)
                    state.structured_state["completed_sections"] = completed

                    curr = state.structured_state.get("sections_completed", 0)
                    state.structured_state["sections_completed"] = curr + 1
                    state.structured_state["current_section"] = section.title
                    state.heartbeat_at = int(time.time() * 1000)
                    update_task_state(state.model_dump())

        return sec_content

    def process_task(self, task_id: str, prompt: str, images: Optional[List[str]] = None) -> AgentTaskState:
        """
        Executes the deterministic workflow pipeline:
        1. LOAD_MANIFEST
        2. VERIFY_INGESTION
        3. EVIDENCE_ANALYSIS (Bounded chunked synthesis)
        4. INTELLIGENCE_ANALYSIS (Deterministic topic/chronology/conflicts)
        5. CHART_ANALYSIS (Deterministic table detection & chart generation)
        6. PLANNING & VALIDATE_PLAN
        7. WRITING (Section-by-section bounded evidence synthesis)
        8. VALIDATE_REPORT_DATA
        9. COMPILE_MARKDOWN_ARTIFACT (Markdown only)
        10. VERIFY_ARTIFACT -> COMPLETED
        """
        state = self.get_task_state(task_id)
        if not state:
            logger.error(f"Task {task_id} not found for owner {self.owner_id}")
            raise ValueError("Task not found or unauthorized.")

        if state.status in [AgentTaskStatus.COMPLETED, AgentTaskStatus.FAILED]:
            logger.info(f"Task {task_id} is already in terminal state: {state.status}")
            return state

        now = int(time.time() * 1000)
        # Bounded startup watchdog: if task remained in PENDING longer than startup deadline
        if state.status == AgentTaskStatus.PENDING and (now - state.created_at) > (PENDING_STARTUP_DEADLINE_SEC * 1000):
            return self._fail_task(
                state,
                code="STARTUP_TIMEOUT",
                message=f"Agent task remained in PENDING state longer than the {PENDING_STARTUP_DEADLINE_SEC}s startup deadline (elapsed {int((now - state.created_at)/1000)}s).",
                stage=WorkflowStage.LOAD_MANIFEST,
                retryable=False
            )

        now_sec = time.time()
        self.task_start_time = now_sec
        self.task_deadline = now_sec + self.overall_deadline_sec

        state.status = AgentTaskStatus.RUNNING
        state.started_at = int(now_sec * 1000)
        state.heartbeat_at = int(now_sec * 1000)
        state.structured_state["job_id"] = task_id
        state.structured_state["task_started_at"] = int(now_sec * 1000)
        state.structured_state["task_deadline"] = int(self.task_deadline * 1000)
        update_task_state(state.model_dump())

        logger.info(f"Starting deterministic report workflow for task/job: {task_id} (overall deadline: {self.overall_deadline_sec}s)")

        stage = WorkflowStage.LOAD_MANIFEST
        try:
            # -------------------------------------------------------------
            # STAGE 1: LOAD_MANIFEST
            # -------------------------------------------------------------
            stage = WorkflowStage.LOAD_MANIFEST
            self._check_task_deadline(state, stage)
            self._set_stage(state, stage, STAGE_DEADLINE_SEC, progress_reason="Loading multi-file ingestion manifest...")

            manifest_data: Optional[Dict[str, Any]] = None
            manifest_path = config.OUTPUTS_DIR / task_id / "manifest.json"
            if manifest_path.exists():
                try:
                    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
                except Exception as e:
                    logger.warning(f"Could not read manifest.json from disk: {e}")

            if not manifest_data:
                manifest_data = get_job(task_id)
                if manifest_data and manifest_data.get("owner_id") and manifest_data.get("owner_id") != self.owner_id:
                    manifest_data = None

            file_list: List[Dict[str, Any]] = []
            if manifest_data and "files" in manifest_data:
                raw_files = manifest_data.get("files", [])
                for rf in raw_files:
                    file_list.append({
                        "file_id": rf.get("file_id"),
                        "filename": rf.get("filename"),
                        "file_type": rf.get("file_type"),
                        "file_size": rf.get("file_size"),
                        "status": rf.get("status")
                    })

            state.structured_state["files_total"] = len(file_list)
            state.structured_state["files_completed"] = manifest_data.get("completed_files", len(file_list)) if manifest_data else len(file_list)
            state.structured_state["manifest"] = {
                "job_id": task_id,
                "files_total": len(file_list),
                "files": file_list
            }
            state.execution_history.append({
                "role": "system",
                "stage": stage.value,
                "files_detected": len(file_list),
                "timestamp": int(time.time() * 1000)
            })
            update_task_state(state.model_dump())

            # -------------------------------------------------------------
            # STAGE 2: VERIFY_INGESTION
            # -------------------------------------------------------------
            stage = WorkflowStage.VERIFY_INGESTION
            self._check_task_deadline(state, stage)
            self._set_stage(state, stage, STAGE_DEADLINE_SEC, progress_reason="Verifying structured evidence records...")

            ev_res = query_evidence(job_id=task_id, owner_id=self.owner_id, limit=5000)
            evidence_items = ev_res.get("items", []) if isinstance(ev_res, dict) else ev_res
            if not evidence_items:
                return self._fail_task(
                    state,
                    code="NO_EVIDENCE",
                    message=f"No structured evidence found for job '{task_id}'. Ingestion must complete before report synthesis.",
                    stage=stage
                )

            state.evidence_references = [item.get("evidence_id") for item in evidence_items if item.get("evidence_id")][:250]
            update_task_state(state.model_dump())

            # -------------------------------------------------------------
            # STAGE 3: EVIDENCE_ANALYSIS (Bounded Evidence Chunking)
            # -------------------------------------------------------------
            stage = WorkflowStage.EVIDENCE_ANALYSIS
            self._check_task_deadline(state, stage)
            self._set_stage(state, stage, STAGE_DEADLINE_SEC, progress_reason="Analyzing evidence in bounded chunks...")

            # Partition evidence into bounded batches of MAX_EVIDENCE_ITEMS_PER_PROMPT
            chunks: List[List[Dict[str, Any]]] = []
            current_chunk: List[Dict[str, Any]] = []
            current_chars = 0

            for item in evidence_items:
                item_text = item.get("content_text") or ""
                if len(current_chunk) >= MAX_EVIDENCE_ITEMS_PER_PROMPT or (current_chars + len(item_text) > MAX_CHUNK_CHARS and current_chunk):
                    chunks.append(current_chunk)
                    current_chunk = [item]
                    current_chars = len(item_text)
                else:
                    current_chunk.append(item)
                    current_chars += len(item_text)
            if current_chunk:
                chunks.append(current_chunk)

            state.structured_state["chunks_total"] = len(chunks)
            state.structured_state["chunks_completed"] = 0
            update_task_state(state.model_dump())

            chunk_summaries: List[str] = []
            for idx, chunk in enumerate(chunks[:8]):  # Bound to max 8 chunks for performance
                self._check_task_deadline(state, stage)
                state.structured_state["active_chunk"] = idx + 1
                state.structured_state["chunk_started_at"] = int(time.time() * 1000)
                update_task_state(state.model_dump())

                chunk_text = "\n---\n".join([
                    f"[Evidence {it.get('evidence_id')}]: {it.get('content_text', '')[:1200]}"
                    for it in chunk
                ])
                summary_prompt = f"Summarize key facts, numbers, and operational metrics in this evidence batch:\n{chunk_text}"
                try:
                    chunk_deadline = min(time.time() + self.llm_call_timeout_sec, self.task_deadline)
                    summary = self._call_qwen(
                        prompt=summary_prompt,
                        system_instruction="You are a strict data analyst. Summarize factual evidence concisely without inventing data.",
                        state=state,
                        stage=stage,
                        max_tokens=300,
                        deadline=chunk_deadline
                    )
                    chunk_summaries.append(summary)
                except (TaskTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                    raise
                except Exception as e:
                    logger.warning(f"Chunk {idx + 1} summarization failed: {e}")
                    chunk_summaries.append(f"Evidence batch {idx + 1}: {len(chunk)} items indexed.")

                state.structured_state["chunks_completed"] = idx + 1
                update_task_state(state.model_dump())

            # -------------------------------------------------------------
            # STAGE 4: INTELLIGENCE_ANALYSIS
            # -------------------------------------------------------------
            stage = WorkflowStage.INTELLIGENCE_ANALYSIS
            self._check_task_deadline(state, stage)
            conflicts: List[Dict[str, Any]] = []
            try:
                intel_res = self._execute_tool_with_state(
                    state, stage, "get_intelligence", {}, ev_count=len(evidence_items)
                )
                conflicts = (intel_res or {}).get("conflicts", [])
                if conflicts:
                    state.conflict_logs = conflicts
                    update_task_state(state.model_dump())
            except (TaskTimeoutError, ToolTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                raise
            except Exception as e:
                return self._fail_task(state, code="INTELLIGENCE_FAILED", message=f"Intelligence analysis failed: {e}", stage=stage)

            # -------------------------------------------------------------
            # STAGE 5: CHART_ANALYSIS
            # -------------------------------------------------------------
            stage = WorkflowStage.CHART_ANALYSIS
            self._check_task_deadline(state, stage)
            charts: List[Dict[str, Any]] = []
            try:
                candidates = self._execute_tool_with_state(
                    state, stage, "detect_charts", {}, ev_count=len(evidence_items)
                )
                if isinstance(candidates, list) and len(candidates) > 0:
                    for cand in candidates[:2]:
                        t_id = cand.get("table_id")
                        if t_id:
                            f_id = cand.get("file_id")
                            x_c = cand.get("detected_time_column") or (cand.get("detected_category_columns") or [None])[0]
                            y_cs = cand.get("detected_metric_columns") or []
                            c_types = cand.get("recommended_chart_types") or ["bar"]
                            c_type = c_types[0] if c_types else "bar"
                            c_title = cand.get("title") or f"Operational Metrics ({cand.get('filename', 'Table')})"
                            if x_c and y_cs:
                                try:
                                    self._execute_tool_with_state(
                                        state, stage, "render_chart",
                                        {
                                            "chart_type": c_type,
                                            "file_id": f_id,
                                            "x_col": x_c,
                                            "y_cols": y_cs,
                                            "title": c_title
                                        },
                                        timeout_sec=15.0,
                                        ev_count=len(evidence_items)
                                    )
                                except Exception as ce:
                                    logger.info(f"Rendering fallback placeholder for chart due to: {ce}")
                                    try:
                                        from backend.services.chart_service import chart_service
                                        chart_service.generate_fallback_chart(
                                            job_id=task_id,
                                            owner_id=self.owner_id,
                                            title=c_title,
                                            error_message=f"Chart render fallback: {ce}"
                                        )
                                    except Exception as fbe:
                                        logger.error(f"Fallback placeholder generation failed: {fbe}")
                            else:
                                # Candidate detected but columns were incomplete - generate fallback placeholder
                                try:
                                    from backend.services.chart_service import chart_service
                                    chart_service.generate_fallback_chart(
                                        job_id=task_id,
                                        owner_id=self.owner_id,
                                        title=c_title,
                                        error_message="Detected tabular structure required metric column resolution; rendered systematic fallback."
                                    )
                                except Exception as fbe:
                                    logger.error(f"Fallback generation failed: {fbe}")

                charts = list_charts_for_job(job_id=task_id, owner_id=self.owner_id)
                # Ensure at least one robust chart artifact is present if evidence exists
                if not charts and evidence_items:
                    try:
                        from backend.services.chart_service import chart_service
                        chart_service.generate_fallback_chart(
                            job_id=task_id,
                            owner_id=self.owner_id,
                            title=f"Operational Performance Overview ({task_id[:8]})",
                            error_message="Automatic chart synthesis completed with systematic baseline placeholder."
                        )
                        charts = list_charts_for_job(job_id=task_id, owner_id=self.owner_id)
                    except Exception as fbe:
                        logger.error(f"Baseline fallback chart generation failed: {fbe}")
            except (TaskTimeoutError, ToolTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                raise
            except Exception as e:
                logger.info(f"Generating fallback chart placeholder following detection notice: {e}")
                try:
                    from backend.services.chart_service import chart_service
                    chart_service.generate_fallback_chart(
                        job_id=task_id,
                        owner_id=self.owner_id,
                        title=f"Operational Performance Overview ({task_id[:8]})",
                        error_message=f"Chart pipeline fallback: {e}"
                    )
                    charts = list_charts_for_job(job_id=task_id, owner_id=self.owner_id)
                except Exception as fbe:
                    logger.error(f"Fallback chart generation failed: {fbe}")

            # -------------------------------------------------------------
            # STAGE 6: PLANNING & VALIDATE_PLAN
            # -------------------------------------------------------------
            stage = WorkflowStage.PLANNING
            self._check_task_deadline(state, stage)
            plan_id = ""
            report_title = prompt if (prompt and len(prompt) < 100) else "Institutional Regulatory Audit Report"
            try:
                plan_res = self._execute_tool_with_state(
                    state, stage, "create_plan",
                    {"title": report_title, "custom_instruction": prompt}
                )
                plan_id = (plan_res or {}).get("plan_id") or (plan_res or {}).get("plan", {}).get("plan_id")
                if not plan_id:
                    raise ValueError("Planner did not return a valid plan_id.")
            except (TaskTimeoutError, ToolTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                raise
            except Exception as e:
                return self._fail_task(state, code="PLANNING_FAILED", message=f"Report planning failed: {e}", stage=stage)

            stage = WorkflowStage.VALIDATE_PLAN
            self._check_task_deadline(state, stage)
            try:
                val_res = self._execute_tool_with_state(state, stage, "validate_plan", {"plan_id": plan_id})
                is_valid = (val_res or {}).get("is_valid", True)
                if not is_valid:
                    logger.warning(f"Plan validation issues: {val_res.get('issues')}")
            except (TaskTimeoutError, ToolTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                raise
            except Exception as e:
                logger.warning(f"Plan validation non-blocking warning: {e}")

            # -------------------------------------------------------------
            # STAGE 7: WRITING (Concurrent Section Evidence Synthesis)
            # -------------------------------------------------------------
            stage = WorkflowStage.WRITING
            self._check_task_deadline(state, stage)

            plan_data = planner_service.get_plan(plan_id, owner_id=self.owner_id)
            if not plan_data:
                return self._fail_task(state, code="PLAN_NOT_FOUND", message=f"Plan {plan_id} could not be retrieved.", stage=stage)

            plan = ReportPlan.from_dict(plan_data) if isinstance(plan_data, dict) else plan_data
            num_sections = max(1, len(plan.sections))
            # Concurrency limit between 3 and 5 (default 4) to avoid overloading Ollama
            concurrency_limit = max(1, min(4, num_sections))
            self._set_stage(
                state, stage,
                int(self.section_writing_timeout_sec * num_sections),
                progress_reason=f"Synthesizing {num_sections} report sections concurrently (concurrency={concurrency_limit})..."
            )

            state.structured_state["sections_total"] = num_sections
            state.structured_state["total_sections"] = num_sections
            state.structured_state["sections_completed"] = 0
            state.structured_state["active_sections"] = []
            state.structured_state["completed_sections"] = []
            update_task_state(state.model_dump())

            async def _run_parallel_section_writing():
                semaphore = asyncio.Semaphore(concurrency_limit)
                state_lock = asyncio.Lock()
                completed_tracker = [0]

                # Deterministic Order: create task list for every section in plan.sections
                tasks = [
                    self._write_section_async(
                        section=section,
                        evidence_items=evidence_items,
                        chunk_summaries=chunk_summaries,
                        conflicts=conflicts,
                        charts=charts,
                        state=state,
                        stage=stage,
                        semaphore=semaphore,
                        plan_title=plan.title,
                        state_lock=state_lock,
                        completed_tracker=completed_tracker
                    )
                    for section in plan.sections
                ]

                # await asyncio.gather(*tasks) executes concurrently & guarantees exact order of plan.sections
                return await asyncio.gather(*tasks)

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    section_contents = pool.submit(lambda: asyncio.run(_run_parallel_section_writing())).result()
            else:
                section_contents = asyncio.run(_run_parallel_section_writing())

            # Assign results to plan sections in deterministic order
            for sec_idx, sec_content in enumerate(section_contents):
                plan.sections[sec_idx].content_text = sec_content

            state.structured_state["active_sections"] = []
            state.structured_state["completed_sections"] = [s.title for s in plan.sections]
            state.structured_state["sections_completed"] = len(plan.sections)
            update_task_state(state.model_dump())

            # Persist synthesized plan sections
            save_plan(plan.to_dict())

            # -------------------------------------------------------------
            # STAGE 8: VALIDATE_REPORT_DATA
            # -------------------------------------------------------------
            stage = WorkflowStage.VALIDATE_REPORT_DATA
            self._check_task_deadline(state, stage)
            self._set_stage(state, stage, STAGE_DEADLINE_SEC, progress_reason="Validating synthesized report data integrity...")
            has_content = any(bool(s.content_text and s.content_text.strip()) for s in plan.sections)
            if not has_content:
                return self._fail_task(state, code="SYNTHESIS_EMPTY", message="Report synthesis produced empty content across all sections.", stage=stage)

            # -------------------------------------------------------------
            # STAGE 9: COMPILE_MARKDOWN_ARTIFACT (Markdown-Only)
            # -------------------------------------------------------------
            stage = WorkflowStage.COMPILE_MARKDOWN_ARTIFACT
            self._check_task_deadline(state, stage)
            report_id = ""
            artifacts: Dict[str, Any] = {}
            try:
                rep_res = self._execute_tool_with_state(
                    state, stage, "generate_report",
                    {"plan_id": plan_id, "title_override": plan.title, "formats": ["markdown"]}
                )
                report_id = (rep_res or {}).get("report_id") or ""
                artifacts = (rep_res or {}).get("artifacts") or {}
            except (TaskTimeoutError, ToolTimeoutError, SectionTimeoutError, LLMCallTimeoutError, FatalToolError):
                raise
            except Exception as e:
                return self._fail_task(state, code="REPORT_COMPILATION_FAILED", message=f"Markdown report compilation failed: {e}", stage=stage)

            if not report_id:
                return self._fail_task(state, code="MISSING_REPORT_ID", message="Report generator completed without returning a valid report_id.", stage=stage)

            # -------------------------------------------------------------
            # STAGE 10: VERIFY_ARTIFACT -> COMPLETED
            # -------------------------------------------------------------
            stage = WorkflowStage.VERIFY_ARTIFACT
            self._check_task_deadline(state, stage)
            self._set_stage(state, stage, STAGE_DEADLINE_SEC, progress_reason="Verifying compiled Markdown report artifact...")

            md_path = artifacts.get("md")
            if not md_path:
                matching = list(config.REPORTS_DIR.glob(f"*{report_id[-6:]}*.md"))
                if matching:
                    md_path = str(matching[0])

            if not md_path or not Path(md_path).exists() or Path(md_path).stat().st_size == 0:
                return self._fail_task(
                    state,
                    code="ARTIFACT_VERIFICATION_FAILED",
                    message=f"Compiled Markdown artifact for report {report_id} does not exist or is empty.",
                    stage=stage
                )

            # Success - Transition to COMPLETED
            now = int(time.time() * 1000)
            state.status = AgentTaskStatus.COMPLETED
            state.updated_at = now
            state.heartbeat_at = now
            state.structured_state["current_stage"] = WorkflowStage.COMPLETED.value
            state.structured_state["current_tool"] = None
            state.structured_state["report_id"] = report_id
            state.structured_state["artifacts"] = artifacts if artifacts else {"md": md_path}
            state.structured_state["final_result"] = report_id
            state.structured_state["progress_reason"] = "Executive report synthesized and verified successfully."
            state.execution_history.append({
                "role": "system",
                "event": "COMPLETED",
                "report_id": report_id,
                "artifact_path": md_path,
                "timestamp": now
            })
            update_task_state(state.model_dump())

            logger.info(f"Task {task_id} COMPLETED successfully. Verified report_id: {report_id}")
            return state

        except TaskTimeoutError as tte:
            logger.error(f"Task {task_id} failed due to overall wallclock timeout: {tte}")
            return self._fail_task(
                state,
                code="WALLCLOCK_TIMEOUT",
                message=str(tte),
                stage=stage,
                tool=state.structured_state.get("current_tool"),
                retryable=False
            )
        except ToolTimeoutError as tte:
            logger.error(f"Task {task_id} failed due to deterministic tool timeout: {tte}")
            return self._fail_task(
                state,
                code="STAGE_TIMEOUT",
                message=str(tte),
                stage=stage,
                tool=state.structured_state.get("current_tool"),
                retryable=False
            )
        except SectionTimeoutError as ste:
            logger.error(f"Task {task_id} failed due to section timeout: {ste}")
            return self._fail_task(
                state,
                code="SECTION_TIMEOUT",
                message=str(ste),
                stage=stage,
                retryable=False
            )
        except LLMCallTimeoutError as lte:
            logger.error(f"Task {task_id} failed due to LLM call timeout: {lte}")
            return self._fail_task(
                state,
                code="LLM_TIMEOUT",
                message=str(lte),
                stage=stage,
                retryable=False
            )
        except FatalToolError as fte:
            logger.error(f"Task {task_id} failed due to fatal tool error: {fte}")
            return self._fail_task(
                state,
                code="FATAL_TOOL_ERROR",
                message=str(fte),
                stage=stage,
                retryable=False
            )
        except Exception as ge:
            logger.error(f"Task {task_id} failed with unhandled exception at stage {stage.value}: {ge}")
            return self._fail_task(
                state,
                code="UNHANDLED_WORKFLOW_ERROR",
                message=str(ge),
                stage=stage,
                retryable=False
            )
