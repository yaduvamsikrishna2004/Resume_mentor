"""Suggestion engine with Gemini integration and deterministic fallback."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from utils.config import settings
from utils.gemini_client import build_generation_config, generate_text_with_resilience, get_gemini_health_snapshot

logger = logging.getLogger(__name__)


def _normalize_missing_skills(raw_skills: list[Any]) -> list[str]:
    """Normalize, deduplicate, and preserve missing-skill order."""
    seen: set[str] = set()
    normalized: list[str] = []
    for item in raw_skills:
        skill = str(item).strip().lower()
        if skill and skill not in seen:
            seen.add(skill)
            normalized.append(skill)
    return normalized


def _build_rule_based_suggestions(missing_skills: list[str]) -> list[dict]:
    """Return deterministic fallback suggestions."""
    suggestions: list[dict] = []
    for skill in missing_skills:
        suggestions.append(
            {
                "skill": skill,
                "learning_suggestion": f"Build a focused 2-week learning plan for {skill}.",
                "project_suggestion": f"Add one portfolio project where {skill} is used in production-like scenarios.",
            }
        )

    if suggestions:
        return suggestions

    return [
        {
            "skill": "general",
            "learning_suggestion": "Keep refining domain depth and measurable impact in your resume bullets.",
            "project_suggestion": "Add one end-to-end project with clear metrics to further improve ATS relevance.",
        }
    ]


def _extract_json_payload(response_text: str) -> list[dict] | None:
    """Parse Gemini text into a JSON list payload."""
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[: -len("```")].strip()

    if not cleaned:
        return None

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end < start:
            return None
        try:
            parsed = json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            return None

    if not isinstance(parsed, list):
        return None
    return [item for item in parsed if isinstance(item, dict)]


def _coerce_suggestion_item(item: dict, skill: str) -> dict:
    """Validate and coerce one suggestion item to stable API shape."""
    learning = str(item.get("learning_suggestion", "")).strip()
    project = str(item.get("project_suggestion", "")).strip()
    if not learning:
        learning = f"Build a focused 2-week learning plan for {skill}."
    if not project:
        project = f"Add one portfolio project where {skill} is used in production-like scenarios."

    return {
        "skill": skill,
        "learning_suggestion": learning,
        "project_suggestion": project,
    }


def _build_prompt(missing_skills: list[str], extra_context: dict[str, Any]) -> str:
    """Build an instruction prompt that enforces machine-readable JSON output."""
    context_blob = json.dumps(extra_context or {}, ensure_ascii=True, default=str)
    skills_blob = json.dumps(missing_skills, ensure_ascii=True)

    return (
        "You are an AI career coach.\n"
        "Create concise, practical suggestions for each missing skill.\n"
        "Return ONLY valid JSON as an array of objects with keys: "
        'skill, learning_suggestion, project_suggestion.\n'
        "Do not add markdown, comments, or extra keys.\n"
        f"Missing skills: {skills_blob}\n"
        f"Extra context: {context_blob}\n"
        "Keep each suggestion to 1 sentence."
    )


def _generate_gemini_suggestions(missing_skills: list[str], extra_context: dict[str, Any]) -> tuple[list[dict] | None, dict[str, Any]]:
    """Generate suggestions using Gemini and normalize output for downstream UI."""
    response_text, meta = generate_text_with_resilience(
        model=settings.gemini_model,
        fallback_model=settings.gemini_fallback_model,
        contents=_build_prompt(missing_skills, extra_context),
        config=build_generation_config(
            response_mime_type="application/json",
            max_output_tokens=650,
            temperature=0.2,
        ),
    )
    if not response_text:
        return None, meta

    parsed = _extract_json_payload(response_text)
    if parsed is None:
        logger.warning("Gemini suggestions returned unparsable JSON; using deterministic fallback.")
        return None, {
            **meta,
            "source": "fallback",
            "reason": "gemini_invalid_json",
        }

    parsed_by_skill: dict[str, dict] = {}
    for item in parsed:
        raw_skill = str(item.get("skill", "")).strip().lower()
        if raw_skill:
            parsed_by_skill[raw_skill] = item

    if missing_skills:
        return [_coerce_suggestion_item(parsed_by_skill.get(skill, {}), skill) for skill in missing_skills], meta

    generic_skill = "general"
    generic_item = parsed_by_skill.get(generic_skill, parsed_by_skill.get(next(iter(parsed_by_skill), ""), {}))
    return [_coerce_suggestion_item(generic_item, generic_skill)], meta


def generate_ai_suggestions_with_meta(data: dict) -> tuple[list[dict], dict[str, Any]]:
    """Generate suggestions with resilience metadata for observability."""
    started = time.perf_counter()
    missing_skills = _normalize_missing_skills(data.get("missing_skills", []))
    extra_context = data.get("extra_context", {}) or {}

    gemini_suggestions, gemini_meta = _generate_gemini_suggestions(missing_skills, extra_context)
    if gemini_suggestions:
        return gemini_suggestions, {
            **gemini_meta,
            "degraded": gemini_meta.get("source") != "gemini_primary",
        }

    return _build_rule_based_suggestions(missing_skills), {
        "provider": "deterministic-fallback",
        "source": "fallback",
        "reason": gemini_meta.get("reason", "gemini_unavailable"),
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "degraded": True,
        **get_gemini_health_snapshot(),
    }


def generate_ai_suggestions(data: dict) -> list[dict]:
    """Backward-compatible suggestions API (list only)."""
    suggestions, _meta = generate_ai_suggestions_with_meta(data)
    return suggestions
