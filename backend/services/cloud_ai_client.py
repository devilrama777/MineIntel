import json
import logging
import re
import time
from typing import Any, Dict, Optional
import requests

from backend import config

logger = logging.getLogger("mineintel.cloud_ai")


class CloudAIClient:
    """
    Lightweight, dependency-free Cloud AI REST adapter.
    Exclusively uses OpenRouter (OpenAI-compatible Chat Completions) with configured model.
    Uses standard requests with bounded exponential backoff for transient failures.
    Ensures zero credential leakage into logs or exceptions.
    """

    OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None,
        provider: Optional[str] = None
    ):
        self.provider = "openrouter"
        self.api_key = (api_key if api_key is not None else config.OPENROUTER_API_KEY).strip()
        self.model = model or config.OPENROUTER_MODEL
        self.timeout = timeout or config.CLOUD_AI_TIMEOUT

    def is_available(self) -> bool:
        """Checks if OpenRouter Cloud AI is enabled and an API key is present."""
        return bool(self.api_key)

    def _sanitize_text(self, text: str) -> str:
        """Strips API keys from strings before logging or error raising."""
        if not text:
            return ""
        if self.api_key and len(self.api_key) > 4:
            text = text.replace(self.api_key, "***REDACTED***")
        return re.sub(r"key=[^&\s]+", "key=***REDACTED***", text)

    def _sanitize_url(self, url: str) -> str:
        """Strips API keys from URLs before logging or error raising."""
        return self._sanitize_text(url)

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 8192,
        model_override: Optional[str] = None,
        timeout_override: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes a generation request against the OpenRouter Chat Completions REST API.
        Implements bounded exponential backoff (up to 2 retries) for transient 429/5xx errors.
        """
        target_model = model_override or self.model
        effective_timeout = timeout_override or self.timeout

        if not self.is_available():
            return {
                "success": False,
                "text": "",
                "model_used": target_model,
                "is_fallback": True,
                "status": "missing_api_key",
                "duration_ms": 0,
                "error": "OpenRouter API key is not configured."
            }

        return self._generate_openrouter(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            target_model=target_model,
            effective_timeout=effective_timeout
        )

    def _generate_openrouter(
        self,
        prompt: str,
        system_instruction: Optional[str],
        temperature: float,
        max_output_tokens: int,
        target_model: str,
        effective_timeout: int
    ) -> Dict[str, Any]:
        """Executes generation against OpenRouter Chat Completions endpoint."""
        url = self.OPENROUTER_ENDPOINT
        messages = []
        if system_instruction and system_instruction.strip():
            messages.append({"role": "system", "content": system_instruction.strip()})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "MineIntel Document Intelligence"
        }

        max_retries = 2
        last_error = ""
        start_time = time.time()

        for attempt in range(max_retries + 1):
            try:
                resp = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=effective_timeout
                )
                elapsed_ms = int((time.time() - start_time) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        returned_model = data.get("model", target_model)

                        # Guard against OpenRouter router picking a safety classifier instead of a text generation model
                        if (returned_model == "nvidia/nemotron-3.5-content-safety:free" or content.strip() == "User Safety: safe") and attempt < max_retries:
                            logger.warning("OpenRouter free pool routed to safety classifier. Retrying for generative model...")
                            time.sleep(1.0)
                            continue

                        return {
                            "success": True,
                            "text": content.strip(),
                            "model_used": target_model,
                            "resolved_model": returned_model,
                            "is_fallback": False,
                            "status": "completed",
                            "duration_ms": elapsed_ms,
                            "error": None
                        }
                    else:
                        logger.warning("OpenRouter returned no choices in response.")
                        return {
                            "success": False,
                            "text": "",
                            "model_used": target_model,
                            "is_fallback": True,
                            "status": "empty_response",
                            "duration_ms": elapsed_ms,
                            "error": "OpenRouter returned no completion choices."
                        }
                elif resp.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    wait_sec = (attempt + 1) * 1.5
                    logger.warning(
                        f"OpenRouter transient error {resp.status_code}. "
                        f"Retrying in {wait_sec}s (attempt {attempt + 1}/{max_retries})..."
                    )
                    time.sleep(wait_sec)
                    continue
                else:
                    err_msg = self._sanitize_text(f"HTTP {resp.status_code}: {resp.text[:200]}")
                    last_error = err_msg
                    logger.warning(f"OpenRouter generation failed: {err_msg}")
                    break

            except requests.exceptions.Timeout:
                last_error = f"Request timed out after {effective_timeout}s"
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                break
            except Exception as e:
                clean_err = self._sanitize_text(str(e))
                last_error = f"Connection error: {clean_err}"
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                break

        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "text": "",
            "model_used": target_model,
            "is_fallback": True,
            "status": "error",
            "duration_ms": elapsed_ms,
            "error": last_error
        }
