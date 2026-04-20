"""Gemini-backed mentor chat response generator with deterministic fallback."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from utils.config import settings
from utils.gemini_client import build_generation_config, generate_text_with_resilience, get_gemini_health_snapshot

logger = logging.getLogger(__name__)


def _normalize_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Normalize and truncate chat history for prompt context."""
    normalized: list[dict[str, str]] = []
    for item in history[-6:]:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        if role not in {"user", "assistant"}:
            role = "user"
        normalized.append({"role": role, "content": content[:700]})
    return normalized


def _build_prompt(message: str, resume_text: str, chat_history: list[dict[str, str]], extra_context: dict[str, Any]) -> str:
    """Build a prompt that keeps responses practical and resume-focused."""
    history_blob = json.dumps(chat_history, ensure_ascii=True)
    context_blob = json.dumps(extra_context or {}, ensure_ascii=True, default=str)
    resume_blob = resume_text[:2200]

    return (
        "You are a resume mentor. Analyze this resume and answer the question.\n"
        "You are an AI Resume Mentor. Give practical, concise, and actionable advice.\n"
        "Focus on resume improvement, skill gaps, interview prep, and job alignment.\n"
        "Use bullet points only if the user asks for a list; otherwise keep to short paragraphs.\n"
        "If context is missing, state assumptions clearly.\n"
        f"Resume text (may be partial): {resume_blob}\n"
        f"Recent chat history JSON: {history_blob}\n"
        f"Extra context JSON: {context_blob}\n"
        f"User question: {message}\n"
        "Answer as the mentor directly."
    )


def _fallback_reply(message: str, extra_context: dict[str, Any]) -> str:
    """Return deterministic fallback when Gemini is unavailable."""
    missing_skills = extra_context.get("missing_skills", [])
    if isinstance(missing_skills, list) and missing_skills:
        top = ", ".join(str(skill) for skill in missing_skills[:3])
        return (
            f"I can still help while Gemini is unavailable. Based on your current gap, prioritize {top}. "
            "For each skill: 1) do 30-45 minutes of focused study daily, 2) build a mini project, "
            "3) add one quantified resume bullet showing impact."
        )

    return (
        "I can still help while Gemini is unavailable. Share your target role and I will give "
        "a step-by-step resume improvement plan."
    )


def generate_mentor_reply_with_meta(data: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Generate mentor chat response with resilience metadata."""
    started = time.perf_counter()
    message = str(data.get("message", "")).strip()
    if not message:
        raise ValueError("message cannot be empty.")

    resume_text = str(data.get("resume_text", "") or "").strip()
    chat_history = _normalize_history(data.get("chat_history", []) or [])
    extra_context = data.get("extra_context", {}) or {}

    reply, meta = generate_text_with_resilience(
        model=settings.gemini_model,
        fallback_model=settings.gemini_fallback_model,
        contents=_build_prompt(message, resume_text, chat_history, extra_context),
        config=build_generation_config(
            max_output_tokens=800,
            temperature=0.35,
        ),
    )
    if reply:
        return reply, {
            **meta,
            "degraded": meta.get("source") != "gemini_primary",
        }

    logger.warning("Gemini mentor chat unavailable; using deterministic fallback. reason=%s", meta.get("reason"))
    return _fallback_reply(message, extra_context), {
        "provider": "deterministic-fallback",
        "source": "fallback",
        "reason": meta.get("reason", "gemini_unavailable"),
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "degraded": True,
        **get_gemini_health_snapshot(),
    }


def generate_mentor_reply(data: dict[str, Any]) -> str:
    """Backward-compatible mentor API (reply text only)."""
    reply, _meta = generate_mentor_reply_with_meta(data)
    return reply
