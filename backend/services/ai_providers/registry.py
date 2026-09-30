"""
MineIntel Phase 3: AI Provider Registry & Dispatcher

Provides:
- Central registry and selection of AI inference providers
- Dynamic switching between cloud (Groq) and sovereign local (Ollama)
- Unified status and diagnostics
"""
import logging
import os
from typing import Any, Dict, List, Optional
import requests

from backend import config
from backend.services.ai_providers.base import BaseAIProvider, BaseProvider
from backend.services.ai_providers.local_ollama import LocalOllamaProvider

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
        self._ensure_initialized()
        target_name = (provider_name or detect_active_provider()).lower().strip()
        if target_name in self._providers:
            return self._providers[target_name]
        return self._providers.get("local_ollama") or next(iter(self._providers.values()))

    def get_active_provider(self) -> BaseAIProvider:
        self._ensure_initialized()
        name = detect_active_provider()
        return self.get_provider(name)

    def list_available_providers(self) -> List[Dict[str, Any]]:
        self._ensure_initialized()
        res = []
        for p in self._providers.values():
            if hasattr(p, "get_status"):
                res.append(p.get_status())
            else:
                res.append({
                    "provider": getattr(p, "provider_name", getattr(p, "name", "unknown")),
                    "available": p.is_available() if hasattr(p, "is_available") else False
                })
        return res

    def get_active_ai_status(self) -> Dict[str, Any]:
        self._ensure_initialized()
        active_name = detect_active_provider()
        active = self.get_provider(active_name)
        active_status = active.get_status() if hasattr(active, "get_status") else {
            "provider": active_name,
            "available": active.is_available() if hasattr(active, "is_available") else False
        }

        return {
            "active_provider": active_name,
            "configured_setting": getattr(config, "AI_PROVIDER_MODE", "local_ollama"),
            "is_available": active.is_available() if hasattr(active, "is_available") else False,
            "active_status": active_status,
            "all_providers": self.list_available_providers()
        }


ai_provider_registry = AIProviderRegistry()


def register_provider(name: str, provider: BaseAIProvider):
    ai_provider_registry.register_provider(name, provider)


def detect_active_provider() -> str:
    """Returns 'groq' if internet+key, else 'local_ollama'."""
    if config.AI_PROVIDER_MODE == "groq" and config.GROQ_API_KEY:
        try:
            r = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {config.GROQ_API_KEY}"},
                timeout=3
            )
            if r.status_code == 200:
                return "groq"
        except Exception:
            pass
    return "local_ollama"


def get_active_provider():
    name = detect_active_provider()
    return get_provider(name)


def get_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    return ai_provider_registry.get_provider(provider_name)


def list_available_providers() -> List[Dict[str, Any]]:
    return ai_provider_registry.list_available_providers()


def get_active_ai_status() -> Dict[str, Any]:
    return ai_provider_registry.get_active_ai_status()


from backend.services.ai_providers.groq import provider as groq_provider
register_provider("groq", groq_provider)

