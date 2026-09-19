"""
MineIntel Phase 3: Local AI Adapter Architecture (Ollama & GGUF Compatible)

Supports:
- Local offline inference via Ollama / GGUF REST runtime
- Qwen3-8B text reasoning & systematic summarization
- Qwen3-VL-8B multimodal visual analysis for image evidence
- Dynamic model availability and health probing
- Strict "Model Unavailable" error handling (zero fake fallback outputs)
"""
import base64
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests

from backend import config
from backend.services.ai_providers.base import AIRequest, AIResponse, BaseAIProvider

logger = logging.getLogger("mineintel.ai.local_ollama")


class LocalOllamaProvider(BaseAIProvider):
    """Local model provider interfacing with Ollama / GGUF server."""

    def __init__(
        self,
        host: Optional[str] = None,
        default_text_model: Optional[str] = None,
        default_vl_model: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.host = (host or getattr(config, "OLLAMA_HOST", "http://localhost:11434")).rstrip("/")
        self.default_text_model = default_model or default_text_model or getattr(config, "LOCAL_MODEL_QWEN3", "qwen3:8b")
        self.default_vl_model = default_vl_model or getattr(config, "LOCAL_MODEL_QWEN3_VL", "qwen3-vl:8b")
        self.timeout = timeout or getattr(config, "LOCAL_AI_TIMEOUT", 60)

    @property
    def provider_name(self) -> str:
        return "local_ollama"

    def is_available(self) -> bool:
        """Probes Ollama service connectivity via /api/tags."""
        try:
            resp = requests.get(f"{self.host}/api/tags", timeout=2.5)
            return resp.status_code == 200
        except Exception:
            return False

    def list_models(self) -> List[str]:
        """Lists downloaded models in local Ollama instance."""
        try:
            resp = requests.get(f"{self.host}/api/tags", timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
                return models
        except Exception as e:
            logger.debug(f"Failed to query Ollama model tags: {e}")
        return []

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive health status of local inference runtime."""
        reachable = self.is_available()
        installed_models = self.list_models() if reachable else []
        text_ready = any(self.default_text_model.lower() in m.lower() for m in installed_models)
        vl_ready = any(self.default_vl_model.lower() in m.lower() for m in installed_models)

        return {
            "provider": self.provider_name,
            "host": self.host,
            "available": reachable,
            "reachable": reachable,
            "configured_text_model": self.default_text_model,
            "configured_vl_model": self.default_vl_model,
            "installed_models": installed_models,
            "text_model_ready": text_ready,
            "vl_model_ready": vl_ready,
            "status": "ready" if (reachable and (text_ready or installed_models)) else ("service_offline" if not reachable else "model_missing"),
            "instruction": f"Run 'ollama serve' to start Ollama and 'ollama pull {self.default_text_model}' to load the model."
        }

    def _prepare_image_base64(self, image_input: str) -> Optional[str]:
        """Converts file path or base64 string into clean base64 payload."""
        if not image_input:
            return None
        # Check if already a base64 string (longer than 100 chars, no file path slash)
        if len(image_input) > 200 and not ("/" in image_input or "\\" in image_input):
            return image_input

        # Check if it's a valid local file path
        p = Path(image_input)
        if p.exists() and p.is_file():
            try:
                raw_bytes = p.read_bytes()
                return base64.b64encode(raw_bytes).decode("utf-8")
            except Exception as e:
                logger.warning(f"Could not read image file {image_input}: {e}")
                return None
        return image_input

    def generate(self, req: AIRequest) -> AIResponse:
        """
        Executes text generation using Qwen3-8B (or configured local model).
        Returns graceful model_unavailable if Ollama or model is absent.
        Never produces fake or synthetic fallback content.
        """
        target_model = req.model or self.default_text_model
        t0 = time.time()

        if not self.is_available():
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="model_unavailable",
                error=f"Local AI runtime (Ollama) is offline at {self.host}. Start Ollama and run 'ollama pull {target_model}' to enable local text reasoning.",
                evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )

        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": req.prompt,
            "stream": False,
            "options": {
                "temperature": req.temperature,
                "num_predict": req.max_tokens
            }
        }
        if req.system_instruction:
            payload["system"] = req.system_instruction

        try:
            resp = requests.post(
                f"{self.host}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            dur_ms = int((time.time() - t0) * 1000)

            if resp.status_code == 200:
                res_data = resp.json()
                text = (res_data.get("response") or "").strip()
                tokens = res_data.get("eval_count")
                prompt_eval = res_data.get("prompt_eval_count")
                dur_sec = round(res_data.get("total_duration", 0) / 1e9, 3) if res_data.get("total_duration") else round(dur_ms / 1000.0, 3)
                return AIResponse(
                    success=True,
                    text=text,
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    duration_seconds=dur_sec,
                    tokens_used=tokens,
                    prompt_tokens=prompt_eval,
                    completion_tokens=tokens,
                    status="completed",
                    evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", []),
                    metadata={"eval_duration": res_data.get("eval_duration"), "total_duration": res_data.get("total_duration")}
                )
            elif resp.status_code == 404:
                return AIResponse(
                    success=False,
                    text="",
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    status="model_unavailable",
                    error=f"Model '{target_model}' not found in local Ollama. Run 'ollama pull {target_model}' to install.",
                    evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
                )
            else:
                return AIResponse(
                    success=False,
                    text="",
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    status="failed",
                    error=f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}",
                    evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
                )

        except requests.exceptions.ConnectionError:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="model_unavailable",
                error=f"Local Ollama service unavailable at {self.host}. Please start it with 'ollama serve'.",
                evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )
        except requests.exceptions.Timeout:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="failed",
                error=f"Local Ollama generation timed out after {self.timeout}s.",
                evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )
        except Exception as e:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="failed",
                error=f"Local Ollama request error: {str(e)}",
                evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )

    def generate_multimodal(self, req: AIRequest) -> AIResponse:
        """
        Executes multimodal visual analysis or caption generation using Qwen3-VL-8B.
        Encodes images into base64 and invokes Ollama multimodal generation.
        """
        target_model = req.model or self.default_vl_model
        t0 = time.time()

        if not self.is_available():
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="model_unavailable",
                error=f"Local AI runtime (Ollama) is offline at {self.host}. Start Ollama and run 'ollama pull {target_model}' to enable Qwen3-VL multimodal visual analysis.",
                evidence_classification=req.context_metadata.get("classification", "AI-GENERATED CAPTION"),
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )

        # Prepare base64 images
        base64_images: List[str] = []
        for img_in in (req.images or []):
            b64 = self._prepare_image_base64(img_in)
            if b64:
                base64_images.append(b64)

        if not base64_images:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="failed",
                error="No valid image input provided for multimodal visual generation.",
                evidence_classification="AI-GENERATED CAPTION",
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )

        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": req.prompt or "Provide a technical description, statutory observations, and executive caption for this visual evidence asset.",
            "images": base64_images,
            "stream": False,
            "options": {
                "temperature": req.temperature,
                "num_predict": req.max_tokens
            }
        }
        if req.system_instruction:
            payload["system"] = req.system_instruction

        try:
            resp = requests.post(
                f"{self.host}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            dur_ms = int((time.time() - t0) * 1000)

            if resp.status_code == 200:
                res_data = resp.json()
                text = (res_data.get("response") or "").strip()
                tokens = res_data.get("eval_count")
                prompt_eval = res_data.get("prompt_eval_count")
                dur_sec = round(res_data.get("total_duration", 0) / 1e9, 3) if res_data.get("total_duration") else round(dur_ms / 1000.0, 3)
                return AIResponse(
                    success=True,
                    text=text,
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    duration_seconds=dur_sec,
                    tokens_used=tokens,
                    prompt_tokens=prompt_eval,
                    completion_tokens=tokens,
                    status="completed",
                    evidence_classification=req.context_metadata.get("classification", "AI-GENERATED CAPTION"),
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", []),
                    metadata={"image_count": len(base64_images)}
                )
            elif resp.status_code == 404:
                return AIResponse(
                    success=False,
                    text="",
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    status="model_unavailable",
                    error=f"Multimodal model '{target_model}' not found in local Ollama. Run 'ollama pull {target_model}' to install Qwen3-VL.",
                    evidence_classification="AI-GENERATED CAPTION",
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
                )
            else:
                return AIResponse(
                    success=False,
                    text="",
                    provider=self.provider_name,
                    model=target_model,
                    duration_ms=dur_ms,
                    status="failed",
                    error=f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}",
                    evidence_classification="AI-GENERATED CAPTION",
                    parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
                )
        except requests.exceptions.ConnectionError:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="model_unavailable",
                error=f"Local Ollama service unavailable at {self.host}. Please start it with 'ollama serve'.",
                evidence_classification="AI-GENERATED CAPTION",
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )
        except Exception as e:
            return AIResponse(
                success=False,
                text="",
                provider=self.provider_name,
                model=target_model,
                duration_ms=int((time.time() - t0) * 1000),
                status="failed",
                error=f"Multimodal generation error: {str(e)}",
                evidence_classification="AI-GENERATED CAPTION",
                parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", [])
            )
