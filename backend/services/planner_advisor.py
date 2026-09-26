"""
MineIntel Phase 6: Report Planner AI Organization Advisor

Utilizes Phase 3 Local AI (qwen2.5:7b) to optimize report titles, section hierarchies,
and executive logical flow while strictly prohibiting AI from altering factual numbers.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from backend import config
from backend.services.ai_providers.base import AIRequest
from backend.services.ai_providers.registry import ai_provider_registry
from backend.services.planner_models import PlannedSection, ReportPlan

logger = logging.getLogger("mineintel.planner_advisor")


class PlannerAdvisor:
    """Provides AI-guided structural refinements for Report Plans."""

    @classmethod
    def refine_plan_with_ai(
        cls,
        plan: ReportPlan,
        custom_instruction: Optional[str] = None
    ) -> ReportPlan:
        """
        Refines section titles and executive summary framing using Ollama Qwen model.
        Grounds prompt only in topic names and section types; zero numbers are passed to alter.
        """
        try:
            # Build schema description
            section_summaries = [
                {"id": s.section_id, "title": s.title, "topic": s.topic, "type": s.section_type}
                for s in plan.sections
            ]
            prompt = (
                f"You are an executive report architect for the Ministry of Coal.\n"
                f"Review this planned report outline for job '{plan.job_id}':\n"
                f"{json.dumps(section_summaries, indent=2)}\n\n"
                f"Directive: {custom_instruction or 'Refine the report title and section titles for professional regulatory presentation.'}\n"
                f"Strict Rule: Do not invent any numbers or operational metrics.\n"
                f"Respond with a JSON object: {{\"title\": \"...\", \"section_titles\": {{\"SEC-1\": \"...\"}}}}"
            )

            provider = ai_provider_registry.get_provider("local_ollama")
            req = AIRequest(
                prompt=prompt,
                system_instruction="You are an expert mining report structural planner. Respond in strict JSON.",
                temperature=0.2,
                max_tokens=400,
                model=getattr(config, "LOCAL_MODEL_QWEN25", "qwen2.5:7b"),
                job_id=plan.job_id,
                owner_id=plan.owner_id
            )
            resp = provider.generate(req)

            if resp and resp.success and resp.text:
                text = resp.text.strip()
                if "{" in text and "}" in text:
                    json_str = text[text.find("{"):text.rfind("}") + 1]
                    data = json.loads(json_str)
                    if data.get("title"):
                        plan.title = data["title"]
                    sec_titles = data.get("section_titles", {})
                    if isinstance(sec_titles, dict):
                        for s in plan.sections:
                            if s.section_id in sec_titles and isinstance(sec_titles[s.section_id], str):
                                s.title = sec_titles[s.section_id]

                    plan.metadata["ai_advisor_enriched"] = True
                    plan.metadata["ai_advisor_model"] = resp.model
                    plan.metadata["ai_advisor_provider"] = resp.provider
        except Exception as e:
            logger.info(f"Local AI planner advice bypassed (using deterministic structure): {e}")

        return plan


planner_advisor = PlannerAdvisor()
