"""
MineIntel Phase 3: Base AI Provider Interface & Unified Request/Response Protocol

Provides:
- Standardized AIRequest and AIResponse schemas
- Provider-neutral BaseAIProvider abstract interface
- Support for text reasoning, summarization, and multimodal visual analysis
"""
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


class AIRequest:
    def __init__(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 8192,
        model: Optional[str] = None,
        images: Optional[List[str]] = None,
        images_base64: Optional[List[str]] = None,
        evidence_items: Optional[List[Dict[str, Any]]] = None,
        job_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ):
        self.prompt = prompt
        self.system_instruction = system_instruction or system_prompt
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.model = model
        self.images = images if images is not None else (images_base64 or [])
        self.evidence_items = evidence_items or []
        self.job_id = job_id
        self.owner_id = owner_id
        self.context_metadata = context_metadata or {}
        self.timeout = timeout

    @property
    def images_base64(self) -> List[str]:
        return self.images


class AIResponse:
    def __init__(
        self,
        text: str = "",
        success: bool = True,
        provider: str = "local_ollama",
        model: str = "qwen2.5:7b",
        duration_ms: int = 0,
        duration_seconds: Optional[float] = None,
        tokens_used: Optional[int] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        status: str = "completed",
        error: Optional[str] = None,
        evidence_classification: str = "AI ANALYSIS",
        parent_evidence_ids: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.text = text
        self.success = success
        self.provider = provider
        self.model = model
        self.duration_ms = duration_ms or (int(duration_seconds * 1000) if duration_seconds is not None else 0)
        self.duration_seconds = duration_seconds if duration_seconds is not None else round(self.duration_ms / 1000.0, 3)
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.tokens_used = tokens_used or ((prompt_tokens or 0) + (completion_tokens or 0) if (prompt_tokens or completion_tokens) else None)
        self.status = status
        self.error = error
        self.evidence_classification = evidence_classification
        self.parent_evidence_ids = parent_evidence_ids or []
        self.metadata = metadata or {}

    @property
    def total_tokens(self) -> int:
        if self.tokens_used is not None:
            return self.tokens_used
        return (self.prompt_tokens or 0) + (self.completion_tokens or 0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "text": self.text,
            "provider": self.provider,
            "model": self.model,
            "duration_ms": self.duration_ms,
            "duration_seconds": self.duration_seconds,
            "tokens_used": self.tokens_used,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "status": self.status,
            "error": self.error,
            "evidence_classification": self.evidence_classification,
            "parent_evidence_ids": self.parent_evidence_ids,
            "metadata": self.metadata
        }


class BaseAIProvider(ABC):
    """Abstract base class for provider-neutral AI inference adapters."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier (e.g. 'local_ollama', 'openrouter')."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Checks if the provider service is reachable and has viable models."""
        pass

    @abstractmethod
    def list_models(self) -> List[str]:
        """Lists available / downloaded models for this provider."""
        pass

    @abstractmethod
    def generate(self, req: AIRequest) -> AIResponse:
        """Executes text reasoning or summarization request."""
        pass

    @abstractmethod
    def generate_multimodal(self, req: AIRequest) -> AIResponse:
        """Executes multimodal visual analysis request (e.g. qwen2.5vl:7b)."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Returns diagnostic status and health details for this provider."""
        pass
