import requests
from typing import Any, Dict
from backend import config
from backend.services.ai_providers.base import BaseProvider, AIRequest, AIResponse


class GroqProvider(BaseProvider):
    name = "groq"
    default_text_model = getattr(config, "GROQ_MODEL", "llama-3.3-70b-versatile")

    @property
    def provider_name(self) -> str:
        return self.name

    def is_available(self) -> bool:
        if not getattr(config, "GROQ_API_KEY", ""):
            return False
        try:
            r = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {config.GROQ_API_KEY}"},
                timeout=3
            )
            return r.status_code == 200
        except Exception:
            return False

    def generate(self, req: AIRequest) -> AIResponse:
        target_model = getattr(req, "model", None) or self.default_text_model
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": req.system_instruction or ""},
                        {"role": "user", "content": req.prompt}
                    ],
                    "temperature": req.temperature,
                    "max_tokens": req.max_tokens
                },
                timeout=req.timeout or 120
            )
            if r.status_code != 200:
                return AIResponse(
                    success=False,
                    status="error",
                    error=f"Groq {r.status_code}: {r.text[:200]}",
                    provider=self.name,
                    model=target_model
                )
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return AIResponse(
                success=True,
                status="ok",
                text=text,
                provider=self.name,
                model=target_model,
                prompt_tokens=usage.get("prompt_tokens"),
                completion_tokens=usage.get("completion_tokens"),
                tokens_used=usage.get("total_tokens")
            )
        except requests.Timeout:
            return AIResponse(
                success=False,
                status="timeout",
                error="Groq timeout",
                provider=self.name,
                model=target_model
            )
        except Exception as e:
            return AIResponse(
                success=False,
                status="error",
                error=str(e),
                provider=self.name,
                model=target_model
            )

    def get_status(self) -> Dict[str, Any]:
        available = self.is_available()
        return {
            "provider": self.name,
            "available": available,
            "reachable": available,
            "configured_text_model": self.default_text_model,
            "status": "ready" if available else ("key_missing" if not getattr(config, "GROQ_API_KEY", "") else "unavailable")
        }


provider = GroqProvider()
