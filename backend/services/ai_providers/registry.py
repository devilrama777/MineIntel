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
            if "openrouter" not in self._providers:
                self._providers["openrouter"] = OpenRouterProvider()
            self._initialized = True

    def register_provider(self, name: str, provider: BaseAIProvider):
        self._providers[name.lower().strip()] = provider

    def get_provider(self, provider_name: Optional[str] = None) -> BaseAIProvider:
        self._ensure_initialized()
        configured = (provider_name or getattr(config, "AI_PROVIDER", "auto")).lower().strip()

        if configured in self._providers:
            return self._providers[configured]

        # Auto resolution
        local_p = self._providers.get("local_ollama")
        if local_p and local_p.is_available():
            return local_p

        cloud_p = self._providers.get("openrouter")
        if cloud_p and cloud_p.is_available():
            return cloud_p

        # Fallback to local provider (returns graceful model_unavailable, never fake data)
        return local_p or cloud_p or list(self._providers.values())[0]

    def list_available_providers(self) -> List[Dict[str, Any]]:
        self._ensure_initialized()
        return [p.get_status() for p in self._providers.values()]

    def get_active_ai_status(self) -> Dict[str, Any]:
        self._ensure_initialized()
        active = self.get_provider()
        active_status = active.get_status()

        return {
            "active_provider": getattr(active, "provider_name", "unknown"),
            "configured_setting": getattr(config, "AI_PROVIDER", "auto"),
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
