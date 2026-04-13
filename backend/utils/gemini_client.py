"""Shared Gemini client helpers with timeout, retries, and circuit breaker."""

from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache
from threading import Lock
from typing import Any

from utils.config import settings

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - optional dependency in local dev
    genai = None
    types = None


@dataclass
class _CircuitState:
    """In-memory circuit breaker state for Gemini availability."""

    consecutive_failures: int = 0
    open_until_unix: float = 0.0
    last_error: str = ""
    last_failure_unix: float = 0.0
    last_success_unix: float = 0.0


_circuit_state = _CircuitState()
_circuit_lock = Lock()


def is_gemini_available() -> bool:
    """Return whether Gemini can be called in this runtime."""
    return settings.can_use_gemini and genai is not None and types is not None


def _is_circuit_open(now_unix: float | None = None) -> bool:
    """Return whether circuit breaker is open right now."""
    now = time.time() if now_unix is None else now_unix
    with _circuit_lock:
        return _circuit_state.open_until_unix > now


def _mark_gemini_success() -> None:
    """Reset breaker state after a successful Gemini response."""
    with _circuit_lock:
        _circuit_state.consecutive_failures = 0
        _circuit_state.open_until_unix = 0.0
        _circuit_state.last_error = ""
        _circuit_state.last_success_unix = time.time()


def _mark_gemini_failure(error_text: str) -> None:
    """Track Gemini failures and open breaker if threshold is exceeded."""
    now = time.time()
    with _circuit_lock:
        _circuit_state.consecutive_failures += 1
        _circuit_state.last_error = error_text[:500]
        _circuit_state.last_failure_unix = now
        if _circuit_state.consecutive_failures >= settings.gemini_circuit_breaker_failures:
            _circuit_state.open_until_unix = now + settings.gemini_circuit_breaker_cooldown_seconds


def get_gemini_health_snapshot() -> dict[str, Any]:
    """Return light health metadata for observability."""
    now = time.time()
    with _circuit_lock:
        open_for_seconds = max(0.0, _circuit_state.open_until_unix - now)
        return {
            "circuit_open": open_for_seconds > 0,
            "circuit_open_for_seconds": round(open_for_seconds, 2),
            "consecutive_failures": _circuit_state.consecutive_failures,
            "last_error": _circuit_state.last_error,
        }


@lru_cache(maxsize=1)
def get_gemini_client():
    """Return a shared Gemini client configured for low-latency resilience."""
    if not is_gemini_available():
        return None

    # Ignore environment proxies for Gemini calls. Some local dev environments
    # set placeholder proxy vars (for example 127.0.0.1:9) that make SDK calls fail.
    http_options = types.HttpOptions(client_args={"trust_env": False})
    return genai.Client(api_key=settings.gemini_api_key, http_options=http_options)


def build_generation_config(
    *,
    response_mime_type: str | None = None,
    max_output_tokens: int | None = None,
    temperature: float | None = None,
):
    """Build a generation config with bounded output for faster responses."""
    if types is None:
        return None

    config_kwargs = {
        "maxOutputTokens": max_output_tokens if max_output_tokens is not None else settings.gemini_max_output_tokens,
        "temperature": settings.gemini_temperature if temperature is None else temperature,
    }
    if response_mime_type:
        config_kwargs["responseMimeType"] = response_mime_type
    return types.GenerateContentConfig(**config_kwargs)


def generate_text_with_resilience(
    *,
    model: str,
    contents: str,
    config: Any = None,
    fallback_model: str | None = None,
) -> tuple[str | None, dict[str, Any]]:
    """
    Generate text from Gemini with circuit breaker and fallback model support.

    Returns:
      (response_text_or_none, metadata_dict)
    """
    started = time.perf_counter()
    client = get_gemini_client()
    if client is None:
        return None, {
            "provider": "deterministic-fallback",
            "source": "fallback",
            "reason": "gemini_not_configured",
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            **get_gemini_health_snapshot(),
        }

    if _is_circuit_open():
        return None, {
            "provider": "deterministic-fallback",
            "source": "fallback",
            "reason": "gemini_circuit_open",
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            **get_gemini_health_snapshot(),
        }

    attempted_models: list[str] = [model]
    if fallback_model and fallback_model.strip() and fallback_model.strip() != model:
        attempted_models.append(fallback_model.strip())

    last_error = ""
    for index, candidate_model in enumerate(attempted_models):
        try:
            response = client.models.generate_content(
                model=candidate_model,
                contents=contents,
                config=config,
            )
            response_text = str(getattr(response, "text", "") or "").strip()
            if not response_text:
                raise RuntimeError("Gemini returned empty text response.")

            _mark_gemini_success()
            source = "gemini_primary" if index == 0 else "gemini_fallback_model"
            return response_text, {
                "provider": "gemini",
                "source": source,
                "model_used": candidate_model,
                "attempted_models": attempted_models,
                "reason": "ok",
                "latency_ms": round((time.perf_counter() - started) * 1000, 2),
                **get_gemini_health_snapshot(),
            }
        except Exception as exc:  # pragma: no cover - network/API runtime branch
            last_error = str(exc)
            continue

    _mark_gemini_failure(last_error or "unknown_error")
    return None, {
        "provider": "deterministic-fallback",
        "source": "fallback",
        "reason": "gemini_request_failed",
        "error": (last_error or "unknown_error")[:500],
        "attempted_models": attempted_models,
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        **get_gemini_health_snapshot(),
    }
