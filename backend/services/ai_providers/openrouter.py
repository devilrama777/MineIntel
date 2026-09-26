"""
MineIntel Phase 3: OpenRouter AI Provider Adapter

Wraps existing CloudAIClient behind the provider-neutral BaseAIProvider interface
to preserve complete backward compatibility while decoupling from hardcoded cloud dependencies.
"""
import logging
import time
from typing import Any, Dict, List, Optional

from backend import config
from backend.services.ai_providers.base import BaseAIProvider, AIRequest, AIResponse
try:
    from backend.services.cloud_ai_client import CloudAIClient
except ImportError:
    class CloudAIClient:  # type: ignore
        def __init__(self, *args, **kwargs):
            self.model = getattr(config, "OPENROUTER_MODEL", "qwen/qwen-2.5-72b-instruct")
        def is_available(self) -> bool:
            return False
        def generate(self, *args, **kwargs):
            return {"success": False, "status": "model_unavailable", "error": "CloudAIClient has been deprecated and removed."}

logger = logging.getLogger("mineintel.ai.openrouter")


class OpenRouterProvider(BaseAIProvider):
    """Cloud provider adapter wrapping OpenRouter."""

    def __init__(
        self,
        client: Optional[CloudAIClient] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        if client is not None:
            self.client = client
        elif api_key is not None or model is not None:
            self.client = CloudAIClient(api_key=api_key, model=model)
        else:
            self.client = CloudAIClient()

    @property
    def provider_name(self) -> str:
        return "openrouter"

    def is_available(self) -> bool:
        return self.client.is_available()

    def list_models(self) -> List[str]:
        return [self.client.model] if self.is_available() else [config.OPENROUTER_MODEL]

    def get_status(self) -> Dict[str, Any]:
        available = self.is_available()
        return {
            "provider": self.provider_name,
            "configured_model": self.client.model,
            "available": available,
            "status": "ready" if available else "missing_api_key"
        }

    def generate(self, req: AIRequest) -> AIResponse:
        t0 = time.time()
        res = self.client.generate(
            prompt=req.prompt,
            system_instruction=req.system_instruction,
            temperature=req.temperature,
            max_output_tokens=req.max_tokens,
            model_override=req.model
        )
        dur_ms = int((time.time() - t0) * 1000)

        success = res.get("success", False)
        status = "completed" if success else ("model_unavailable" if res.get("status") == "missing_api_key" else "failed")

        return AIResponse(
            success=success,
            text=res.get("text", ""),
            provider=self.provider_name,
            model=res.get("model_used", self.client.model),
            duration_ms=dur_ms,
            tokens_used=res.get("tokens_used"),
            prompt_tokens=res.get("prompt_tokens"),
            completion_tokens=res.get("completion_tokens"),
            status=status,
            error=res.get("error"),
            evidence_classification=req.context_metadata.get("classification", "AI ANALYSIS"),
            parent_evidence_ids=req.context_metadata.get("parent_evidence_ids", []),
            metadata={"is_fallback": res.get("is_fallback", False)}
        )

    def generate_multimodal(self, req: AIRequest) -> AIResponse:
        """Multimodal proxy passing visual prompt to cloud model."""
        # Append image reference into prompt
        prompt_with_images = req.prompt
        if req.images:
            prompt_with_images += f"\n\n[Visual Assets Attached: {len(req.images)} images provided]"
        req.prompt = prompt_with_images
        resp = self.generate(req)
        resp.evidence_classification = "AI-GENERATED CAPTION"
        return resp
