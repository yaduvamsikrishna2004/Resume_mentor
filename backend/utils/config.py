"""Runtime configuration helpers."""

import os
from dataclasses import dataclass


def _as_bool(raw_value: str | None, default: bool = False) -> bool:
    """Parse a loose boolean string from environment variables."""
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(raw_value: str | None, default: int, *, min_value: int | None = None, max_value: int | None = None) -> int:
    """Parse an integer env var with optional bounds."""
    try:
        parsed = int(str(raw_value).strip()) if raw_value is not None else default
    except (TypeError, ValueError):
        parsed = default

    if min_value is not None:
        parsed = max(min_value, parsed)
    if max_value is not None:
        parsed = min(max_value, parsed)
    return parsed


def _as_float(raw_value: str | None, default: float, *, min_value: float | None = None, max_value: float | None = None) -> float:
    """Parse a float env var with optional bounds."""
    try:
        parsed = float(str(raw_value).strip()) if raw_value is not None else default
    except (TypeError, ValueError):
        parsed = default

    if min_value is not None:
        parsed = max(min_value, parsed)
    if max_value is not None:
        parsed = min(max_value, parsed)
    return parsed


@dataclass(frozen=True)
class Settings:
    """Application settings pulled from environment variables."""

    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    mongo_db_name: str = os.getenv("MONGO_DB_NAME", "resume_mentor")
    mongo_collection_name: str = os.getenv("MONGO_COLLECTION_NAME", "resumes")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-pro")
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash").strip()
    gemini_enabled: bool = _as_bool(os.getenv("GEMINI_ENABLED"), default=True)
    gemini_timeout_seconds: float = _as_float(os.getenv("GEMINI_TIMEOUT_SECONDS"), 12.0, min_value=3.0, max_value=120.0)
    gemini_retry_attempts: int = _as_int(os.getenv("GEMINI_RETRY_ATTEMPTS"), 1, min_value=1, max_value=5)
    gemini_max_output_tokens: int = _as_int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS"), 700, min_value=128, max_value=2048)
    gemini_temperature: float = _as_float(os.getenv("GEMINI_TEMPERATURE"), 0.3, min_value=0.0, max_value=1.0)
    gemini_circuit_breaker_failures: int = _as_int(
        os.getenv("GEMINI_CIRCUIT_BREAKER_FAILURES"), 3, min_value=1, max_value=10
    )
    gemini_circuit_breaker_cooldown_seconds: float = _as_float(
        os.getenv("GEMINI_CIRCUIT_BREAKER_COOLDOWN_SECONDS"), 45.0, min_value=5.0, max_value=600.0
    )

    @property
    def can_use_gemini(self) -> bool:
        """Return whether Gemini should be used for generation."""
        return self.gemini_enabled and bool(self.gemini_api_key)


settings = Settings()
