"""
MineIntel Phase 3: AI Inference Service (Structured Evidence Reasoning & Multimodal Captioning)

Orchestrates:
- Evidence-grounded text reasoning via Qwen3-8B (or configured provider)
- Multimodal visual captioning via Qwen3-VL-8B
- Generating derived Phase 2 StructuredEvidenceItem records
- Strict Model Unavailable error handling (never fake fallback output)
"""
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional

from backend.services.ai_providers.base import AIRequest, AIResponse
from backend.services.ai_providers.registry import (
    ai_provider_registry,
    get_provider,
    get_active_ai_status,
)
from backend.services.evidence_models import (
    EvidenceClassification,
    EvidenceLayer,
    StructuredEvidenceItem,
)
from backend.services.evidence_prompt_builder import prompt_builder
from backend.services import evidence_store

logger = logging.getLogger("mineintel.ai.inference_service")


class AIInferenceService:
    """High-level service coordinating AI inference and structured evidence lineage."""

    def __init__(self, provider_registry: Optional[Any] = None):
        self.provider_registry = provider_registry
        self.registry = provider_registry or ai_provider_registry

    def _get_provider(self, provider_name: Optional[str] = None):
        """Ollama ONLY: Always dispatches to local_ollama provider."""
        if self.provider_registry is not None:
            return self.provider_registry.get_provider("local_ollama")
        return ai_provider_registry.get_provider("local_ollama")

    def generate_job_reasoning(
        self,
        job_id: str,
        owner_id: str,
        custom_instruction: Optional[str] = None,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        Executes structured evidence reasoning:
        1. Assembles locked facts, calculated values, and narratives into an evidence-aware prompt.
        2. Dispatches to selected AI provider (Local Qwen3-8B or OpenRouter).
        3. Persists AI output as an AI ANALYSIS derived evidence item.
        """
        prompt_text, system_inst, parent_ids = prompt_builder.build_reasoning_prompt(
            job_id=job_id,
            owner_id=owner_id,
            custom_instruction=custom_instruction
        )

        provider = self._get_provider(provider_name)
        req = AIRequest(
            prompt=prompt_text,
            system_instruction=system_inst,
            temperature=temperature,
            model=model_name,
            job_id=job_id,
            owner_id=owner_id,
            context_metadata={
                "classification": EvidenceClassification.AI_ANALYSIS.value,
                "parent_evidence_ids": parent_ids
            }
        )

        try:
            resp: AIResponse = provider.generate(req)
        except Exception as e:
            return {
                "success": False,
                "status": "model_unavailable",
                "error": f"Inference provider execution failed or unavailable: {str(e)}"
            }

        if not resp.success:
            return {
                "success": False,
                "status": resp.status,
                "error": resp.error,
                "provider": resp.provider,
                "model": resp.model,
                "duration_ms": resp.duration_ms
            }

        # Persist generated AI analysis as a derived evidence item
        digest = hashlib.sha256(f"{job_id}:{resp.text[:60]}:{resp.model}".encode()).hexdigest()[:12].upper()
        ev_id = f"EVD-AI-{digest}"
        now_ms = int(time.time() * 1000)

        evidence_item = StructuredEvidenceItem(
            evidence_id=ev_id,
            job_id=job_id,
            file_id="ai_reasoning_pipeline",
            owner_id=owner_id,
            layer=EvidenceLayer.DERIVED.value,
            classification=EvidenceClassification.AI_ANALYSIS.value,
            content_text=resp.text,
            content_json={
                "provider": resp.provider,
                "model": resp.model,
                "duration_ms": resp.duration_ms,
                "tokens_used": resp.tokens_used
            },
            raw_reference={"job_id": job_id},
            provenance={
                "source_type": "ai_reasoning",
                "provenance": f"AI Reasoning by {resp.model}",
                "citation": f"{resp.provider}:{resp.model}"
            },
            derived_from_ids=parent_ids,  # Full parent evidence lineage
            confidence=0.85,  # Clearly separated below 1.0 facts
            metadata={
                "provider": resp.provider,
                "model": resp.model,
                "ai_provider": resp.provider,
                "ai_model": resp.model,
                "temperature": temperature
            },
            created_at=now_ms
        )

        evidence_store.save_evidence_items([evidence_item.to_dict()])

        return {
            "success": True,
            "status": resp.status,
            "evidence_id": ev_id,
            "classification": EvidenceClassification.AI_ANALYSIS.value,
            "layer": EvidenceLayer.DERIVED.value,
            "derived_from_ids": parent_ids,
            "provider": resp.provider,
            "model": resp.model,
            "duration_ms": resp.duration_ms,
            "analysis_text": resp.text,
            "parent_evidence_count": len(parent_ids),
            "evidence_item": evidence_item.to_dict()
        }

    run_evidence_reasoning = generate_job_reasoning

    def generate_image_caption(
        self,
        evidence_id: str,
        owner_id: str,
        custom_instruction: Optional[str] = None,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes multimodal visual evidence analysis / captioning with Qwen3-VL-8B:
        1. Loads image evidence item and raw file reference.
        2. Dispatches image and visual prompt to multimodal model.
        3. Persists result as AI-GENERATED CAPTION derived evidence item.
        """
        image_ev = evidence_store.get_evidence_by_id(evidence_id)
        if not image_ev:
            return {
                "success": False,
                "status": "not_found",
                "error": f"Image evidence item '{evidence_id}' not found."
            }

        prompt_text, system_inst, parent_ids = prompt_builder.build_multimodal_caption_prompt(
            image_evidence=image_ev,
            custom_instruction=custom_instruction
        )

        raw_path = (image_ev.get("raw_reference") or {}).get("raw_path") or (image_ev.get("provenance") or {}).get("raw_path", "")
        images = [raw_path] if raw_path else []

        provider = self._get_provider(provider_name)
        req = AIRequest(
            prompt=prompt_text,
            system_instruction=system_inst,
            model=model_name,
            images=images,
            job_id=image_ev.get("job_id"),
            owner_id=owner_id,
            context_metadata={
                "classification": EvidenceClassification.AI_GENERATED_CAPTION.value,
                "parent_evidence_ids": parent_ids
            }
        )

        try:
            resp: AIResponse = provider.generate_multimodal(req)
        except Exception as e:
            return {
                "success": False,
                "status": "model_unavailable",
                "error": f"Inference provider execution failed or unavailable: {str(e)}"
            }

        if not resp.success:
            return {
                "success": False,
                "status": resp.status,
                "error": resp.error,
                "provider": resp.provider,
                "model": resp.model
            }

        # Persist caption as derived evidence item
        digest = hashlib.sha256(f"{evidence_id}:{resp.text[:40]}".encode()).hexdigest()[:12].upper()
        caption_ev_id = f"EVD-CAPTION-{digest}"
        now_ms = int(time.time() * 1000)

        caption_item = StructuredEvidenceItem(
            evidence_id=caption_ev_id,
            job_id=image_ev.get("job_id", ""),
            file_id=image_ev.get("file_id", ""),
            owner_id=owner_id,
            layer=EvidenceLayer.DERIVED.value,
            classification=EvidenceClassification.AI_GENERATED_CAPTION.value,
            content_text=resp.text,
            content_json={
                "caption": resp.text,
                "provider": resp.provider,
                "model": resp.model,
                "source_image_id": evidence_id
            },
            raw_reference=image_ev.get("raw_reference", {}),
            provenance={
                "source_type": "image_caption",
                "provenance": f"Visual Caption for {evidence_id}",
                "citation": f"{resp.provider}:{resp.model}"
            },
            derived_from_ids=[evidence_id],
            confidence=0.80,  # Clearly separated below 1.0 facts
            metadata={
                "provider": resp.provider,
                "model": resp.model,
                "ai_provider": resp.provider,
                "ai_model": resp.model
            },
            created_at=now_ms
        )

        evidence_store.save_evidence_items([caption_item.to_dict()])

        return {
            "success": True,
            "status": resp.status,
            "evidence_id": caption_ev_id,
            "classification": EvidenceClassification.AI_GENERATED_CAPTION.value,
            "layer": EvidenceLayer.DERIVED.value,
            "derived_from_ids": [evidence_id],
            "caption": resp.text,
            "provider": resp.provider,
            "model": resp.model,
            "parent_image_id": evidence_id,
            "evidence_item": caption_item.to_dict()
        }

    run_multimodal_caption = generate_image_caption


ai_inference_service = AIInferenceService()
