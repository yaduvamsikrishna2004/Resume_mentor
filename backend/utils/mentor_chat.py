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
    """Build a structured resume-mentor prompt with ATS context and conversation memory."""
    history_blob = json.dumps(chat_history, ensure_ascii=True)
    context_blob = json.dumps(extra_context or {}, ensure_ascii=True, default=str)
    resume_blob = resume_text[:2600]
    job_description = str(extra_context.get("job_description", "") or "").strip()[:1800]

    return (
        "You are an expert AI resume mentor.\n\n"
        f"Conversation history:\n{history_blob}\n\n"
        f"Resume:\n{resume_blob or 'Not provided'}\n\n"
        f"Job description:\n{job_description or 'Not provided'}\n\n"
        f"Additional context:\n{context_blob}\n\n"
        f"User message:\n{message}\n\n"
        "Respond like a helpful mentor with:\n"
        "- Clear explanations\n"
        "- Bullet points\n"
        "- Actionable advice\n"
        "- ATS optimization tips\n"
        "- Industry-level feedback\n\n"
        "Keep answers practical and concise. If information is missing, state assumptions briefly."
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


def _chunk_text(text: str, chunk_size: int = 42) -> list[str]:
    """Split text into streaming-friendly chunks."""
    cleaned = text.strip()
    if not cleaned:
        return []
    return [cleaned[i : i + chunk_size] for i in range(0, len(cleaned), chunk_size)]


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


def generate_mentor_reply_stream(data: dict[str, Any]) -> tuple[list[str], dict[str, Any]]:
    """Generate a chunked stream payload for HTTP streaming responses."""
    reply, meta = generate_mentor_reply_with_meta(data)
    return _chunk_text(reply), meta


def improve_resume_with_meta(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Auto-rewrite resume bullets and return structured version payload."""
    started = time.perf_counter()
    resume_text = str(data.get("resume_text", "") or "").strip()
    if not resume_text:
        raise ValueError("resume_text cannot be empty.")

    focus_areas = data.get("focus_areas", []) or []
    focus_blob = json.dumps([str(item).strip() for item in focus_areas if str(item).strip()], ensure_ascii=True)
    job_description = str(data.get("job_description", "") or "").strip()[:1800]

    prompt = (
        "You are an expert resume mentor and technical recruiter.\n"
        "Rewrite resume bullet points to be quantifiable, concise, and ATS-optimized.\n"
        "Return plain text with sections:\n"
        "Summary:\n"
        "Improved Bullets:\n"
        "Keyword Coverage:\n"
        f"Focus Areas: {focus_blob or '[]'}\n"
        f"Target Job Description: {job_description or 'Not provided'}\n"
        f"Resume Text:\n{resume_text[:3200]}"
    )

    response_text, meta = generate_text_with_resilience(
        model=settings.gemini_model,
        fallback_model=settings.gemini_fallback_model,
        contents=prompt,
        config=build_generation_config(max_output_tokens=900, temperature=0.35),
    )

    if response_text:
        improved_text = response_text.strip()
        bullets = [
            line.strip("-* ").strip()
            for line in improved_text.splitlines()
            if line.strip().startswith(("-", "*"))
        ]
        return (
            {
                "improved_text": improved_text,
                "improved_bullets": bullets[:12],
                "created_at": time.time(),
            },
            {
                **meta,
                "degraded": meta.get("source") != "gemini_primary",
            },
        )

    fallback_text = (
        "Summary:\n"
        "Use stronger action verbs, add measurable impact, and align with required keywords.\n\n"
        "Improved Bullets:\n"
        "- Built and shipped features that improved process efficiency and reduced manual effort.\n"
        "- Led end-to-end delivery of projects with clear ownership, timelines, and measurable outcomes.\n"
        "- Collaborated cross-functionally to resolve high-priority issues and improve product reliability.\n\n"
        "Keyword Coverage:\n"
        "- Add role-specific keywords directly from the target job description.\n"
        "- Mention tools/frameworks with context and measurable impact."
    )
    return (
        {
            "improved_text": fallback_text,
            "improved_bullets": [
                "Built and shipped features that improved process efficiency and reduced manual effort.",
                "Led end-to-end delivery of projects with clear ownership, timelines, and measurable outcomes.",
                "Collaborated cross-functionally to resolve high-priority issues and improve product reliability.",
            ],
            "created_at": time.time(),
        },
        {
            "provider": "deterministic-fallback",
            "source": "fallback",
            "reason": meta.get("reason", "gemini_unavailable"),
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "degraded": True,
            **get_gemini_health_snapshot(),
        },
    )
