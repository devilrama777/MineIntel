"""
MineIntel Phase 3: AI Provider Registry & Dispatcher

Provides:
- Central registry and selection of AI inference providers
- Automatic local-first or configurable dispatching (auto / local_ollama / openrouter)
- Unified status and diagnostics
"""
import logging
import os
from typing import Any, Dict, List, Optional

from backend import config
from backend.services.ai_providers.base import BaseAIProvider
from backend.services.ai_providers.local_ollama import LocalOllamaProvider
from backend.services.ai_providers.openrouter import OpenRouterProvider

logger = logging.getLogger("mineintel.ai.registry")

class AIProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseAIProvider] = {}
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            if "local_ollama" not in self._providers:
                self._providers["local_ollama"] = LocalOllamaProvider()
            self._initialized = True

    def register_provider(self, name: str, provider: BaseAIProvider):
        self._providers[name.lower().strip()] = provider

    def get_provider(self, provider_name: Optional[str] = None) -> BaseAIProvider:
        """
        Ollama ONLY: Always dispatches to local_ollama.
        Does not use OpenRouter or other cloud providers for report generation.
        If local Ollama or the configured model is unavailable, the provider
        returns clear Model Unavailable status (zero fake fallback outputs).
        """
        self._ensure_initialized()
        return self._providers["local_ollama"]

    def list_available_providers(self) -> List[Dict[str, Any]]:
        self._ensure_initialized()
        return [self._providers["local_ollama"].get_status()]

    def get_active_ai_status(self) -> Dict[str, Any]:
        self._ensure_initialized()
        active = self.get_provider("local_ollama")
        active_status = active.get_status()

        return {
            "active_provider": "local_ollama",
            "configured_setting": "local_ollama",
            "is_available": active.is_available(),
            "active_status": active_status,
            "all_providers": self.list_available_providers()
        }


ai_provider_registry = AIProviderRegistry()


def get_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    return ai_provider_registry.get_provider(provider_name)


def list_available_providers() -> List[Dict[str, Any]]:
    return ai_provider_registry.list_available_providers()


def get_active_ai_status() -> Dict[str, Any]:
    return ai_provider_registry.get_active_ai_status()
