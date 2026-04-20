"""Gemini-backed mentor chat response generator with deterministic fallback."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from utils.config import settings
from utils.gemini_client import build_generation_config, generate_text_with_resilience, get_gemini_health_snapshot

logger = logging.getLogger(__name__)


def _normalize_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Normalize and truncate chat history for prompt context."""
    normalized: list[dict[str, str]] = []
    for item in history[-10:]:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        if role not in {"user", "assistant"}:
            role = "user"
        normalized.append({"role": role, "content": content[:700]})
    return normalized


def _build_prompt(message: str, resume_text: str, chat_history: list[dict[str, str]], extra_context: dict[str, Any]) -> str:
    """Build a strict recruiter-grade resume mentor prompt."""
    history_blob = json.dumps(chat_history, ensure_ascii=True)
    context_blob = json.dumps(extra_context or {}, ensure_ascii=True, default=str)
    resume_blob = resume_text[:2600]
    job_description = str(extra_context.get("job_description", "") or "").strip()[:1800]
    extracted_skills = extra_context.get("extracted_skills", [])
    ats_score = extra_context.get("ats_score", "Unknown")

    return (
        "System role: You are a strict resume reviewer.\n"
        "You are an expert AI Resume Mentor with deep knowledge of ATS systems, hiring practices, and technical roles.\n"
        "Act like a senior recruiter + career coach and provide high-quality, structured, actionable feedback.\n\n"
        "STRICT INSTRUCTIONS:\n"
        "1) Always respond in this exact structure and section order:\n\n"
        "🔍 ATS SCORE ANALYSIS\n"
        "- Explain WHY the score is low/high with specific reasons.\n\n"
        "🚨 TOP ISSUES (3-5 points)\n"
        "- Be very specific.\n"
        "- Reference actual missing skills, mismatches, or resume problems.\n\n"
        "✅ IMPROVEMENTS (Actionable fixes)\n"
        "- Provide concrete rewrite suggestions.\n"
        "- Add missing technologies.\n"
        "- Improve wording using measurable impact.\n\n"
        "💡 PRO TIPS\n"
        "- Provide industry-level advice.\n"
        "- Include what recruiters actually look for.\n\n"
        "2) Use bullet points, clear sections, and a professional tone.\n"
        "3) Be specific. Avoid vague advice.\n"
        "4) If resume and job description mismatch, explicitly explain the mismatch.\n"
        "5) If context is missing, say so briefly and continue with best-effort guidance.\n\n"
        f"Conversation history:\n{history_blob}\n\n"
        f"Resume:\n{resume_blob or 'Not provided'}\n\n"
        f"Extracted Skills:\n{json.dumps(extracted_skills, ensure_ascii=True)}\n\n"
        f"ATS Score:\n{ats_score}\n\n"
        f"Job Description:\n{job_description or 'Not provided'}\n\n"
        f"Additional context:\n{context_blob}\n\n"
        f"User Question:\n{message}\n"
    )


def _clean_markdown(text: str) -> str:
    """Normalize markdown-like output for consistent rendering."""
    cleaned = (text or "").replace("\r", "").strip()
    cleaned = cleaned.replace("•", "- ")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def _has_required_sections(text: str) -> bool:
    """Check whether output contains the required section headers."""
    required_headers = [
        "🔍 ATS SCORE ANALYSIS",
        "🚨 TOP ISSUES",
        "✅ IMPROVEMENTS",
        "💡 PRO TIPS",
    ]
    return all(header in text for header in required_headers)


def _to_structured_sections(text: str) -> str:
    """Coerce free-form response into required recruiter-style sections."""
    cleaned = _clean_markdown(text)
    if _has_required_sections(cleaned):
        return cleaned

    summary = cleaned.splitlines()[0].strip() if cleaned else "Resume needs stronger job alignment and quantified impact."
    return (
        "🔍 ATS SCORE ANALYSIS\n"
        f"- {summary}\n"
        "- Score is primarily driven by skill match depth, ATS keyword alignment, and quantified outcomes.\n\n"
        "🚨 TOP ISSUES (3–5 points)\n"
        "- Missing explicit job-critical keywords from the target role.\n"
        "- Bullets are not consistently quantified with measurable impact.\n"
        "- Resume language may be too generic for technical screening.\n\n"
        "✅ IMPROVEMENTS (Actionable fixes)\n"
        "- Rewrite bullets using action verb + metric + outcome format.\n"
        "- Add role-aligned technologies from the job description in context.\n"
        "- Prioritize recent, relevant projects with production impact.\n\n"
        "💡 PRO TIPS\n"
        "- Recruiters scan quickly for exact stack match and impact metrics first.\n"
        "- Put strongest role-aligned achievements in the top third of the resume."
    )


def _is_weak_response(text: str) -> bool:
    """Heuristic quality gate for one-shot regeneration."""
    cleaned = _clean_markdown(text)
    if len(cleaned) < 220:
        return True
    if cleaned.count("- ") < 6:
        return True
    return not _has_required_sections(cleaned)


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

    prompt = _build_prompt(message, resume_text, chat_history, extra_context)
    reply, meta = generate_text_with_resilience(
        model=settings.gemini_model,
        fallback_model=settings.gemini_fallback_model,
        contents=prompt,
        config=build_generation_config(
            max_output_tokens=800,
            temperature=0.35,
        ),
    )
    if reply:
        regenerated = False
        if _is_weak_response(reply):
            retry_prompt = (
                f"{prompt}\n\n"
                "The previous draft was weak. Regenerate once with higher specificity, strict section headers, "
                "and concrete role-aligned technical recommendations."
            )
            second_reply, second_meta = generate_text_with_resilience(
                model=settings.gemini_model,
                fallback_model=settings.gemini_fallback_model,
                contents=retry_prompt,
                config=build_generation_config(max_output_tokens=900, temperature=0.25),
            )
            if second_reply:
                reply = second_reply
                meta = second_meta
                regenerated = True

        return _to_structured_sections(reply), {
            **meta,
            "regenerated_once": regenerated,
            "degraded": meta.get("source") != "gemini_primary",
        }

    logger.warning("Gemini mentor chat unavailable; using deterministic fallback. reason=%s", meta.get("reason"))
    return _to_structured_sections(_fallback_reply(message, extra_context)), {
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
