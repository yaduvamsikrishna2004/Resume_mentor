"""Business logic helpers for skill-gap and ATS scoring."""

from __future__ import annotations

import re
from collections import defaultdict


SKILL_ALIASES: dict[str, str] = {
    "nodejs": "node.js",
    "node js": "node.js",
    "nextjs": "next.js",
    "ci cd": "ci/cd",
    "ci-cd": "ci/cd",
    "restful api": "rest api",
    "restful apis": "rest api",
    "js": "javascript",
    "ts": "typescript",
    "ml": "machine learning",
    "dl": "deep learning",
}

SKILL_BASE_WEIGHT: dict[str, float] = {
    "python": 1.25,
    "java": 1.2,
    "javascript": 1.15,
    "typescript": 1.15,
    "system design": 1.2,
    "docker": 1.2,
    "kubernetes": 1.2,
    "aws": 1.2,
    "azure": 1.15,
    "gcp": 1.15,
    "sql": 1.15,
    "postgresql": 1.15,
    "mongodb": 1.1,
    "fastapi": 1.15,
    "django": 1.15,
    "react": 1.1,
    "node.js": 1.15,
    "machine learning": 1.2,
    "deep learning": 1.15,
}

CRITICAL_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "docker",
    "aws",
    "kubernetes",
    "system design",
    "postgresql",
    "mongodb",
    "node.js",
    "fastapi",
    "django",
}

RELATED_SKILLS: dict[str, set[str]] = {
    "aws": {"azure", "gcp"},
    "azure": {"aws", "gcp"},
    "gcp": {"aws", "azure"},
    "django": {"flask", "fastapi", "express"},
    "flask": {"django", "fastapi"},
    "fastapi": {"flask", "django", "express"},
    "react": {"next.js", "javascript", "typescript"},
    "next.js": {"react", "javascript", "typescript"},
    "node.js": {"express", "javascript", "typescript"},
    "express": {"node.js", "fastapi", "flask"},
    "postgresql": {"mysql", "mongodb"},
    "mysql": {"postgresql", "mongodb"},
    "mongodb": {"postgresql", "mysql"},
    "machine learning": {"deep learning", "scikit-learn", "tensorflow", "pytorch"},
    "deep learning": {"machine learning", "tensorflow", "pytorch"},
    "tensorflow": {"pytorch", "deep learning", "machine learning"},
    "pytorch": {"tensorflow", "deep learning", "machine learning"},
    "nlp": {"machine learning", "deep learning"},
    "ci/cd": {"docker", "kubernetes", "terraform"},
}

REQUIRED_HINTS = {
    "must have",
    "required",
    "requirements",
    "mandatory",
    "qualification",
}
PREFERRED_HINTS = {
    "preferred",
    "nice to have",
    "good to have",
    "plus",
    "bonus",
}


def _normalize_skill(skill: str) -> str:
    """Normalize one skill string for matching."""
    cleaned = re.sub(r"\s+", " ", (skill or "").strip().lower())
    return SKILL_ALIASES.get(cleaned, cleaned)


def _normalized_set(skills: list[str]) -> set[str]:
    """Normalize and deduplicate skill list."""
    return {_normalize_skill(skill) for skill in skills if (skill or "").strip()}


def _priority_multiplier(skill: str, job_description: str) -> float:
    """Infer required/preferred priority from local context around a skill mention."""
    if not job_description:
        return 1.0

    text = job_description.lower()
    positions = [match.start() for match in re.finditer(re.escape(skill), text)]
    if not positions:
        return 1.0

    multiplier = 1.0
    for start in positions[:3]:
        window_start = max(0, start - 110)
        window = text[window_start : start + len(skill)]
        if any(hint in window for hint in REQUIRED_HINTS):
            multiplier = max(multiplier, 1.35)
        elif any(hint in window for hint in PREFERRED_HINTS):
            multiplier = min(multiplier, 0.9)
    return multiplier


def _build_skill_weights(job_skills: set[str], job_description: str) -> dict[str, float]:
    """Assign weights so ATS reflects skill importance, not just count."""
    weights: dict[str, float] = {}
    for skill in job_skills:
        base = SKILL_BASE_WEIGHT.get(skill, 1.0)
        priority = _priority_multiplier(skill, job_description)
        weights[skill] = round(base * priority, 3)
    return weights


def _partial_match_credit(job_skill: str, resume_set: set[str]) -> tuple[float, str | None]:
    """Return related-skill credit when exact skill is missing."""
    related_candidates = RELATED_SKILLS.get(job_skill, set())
    matched_related = sorted(resume_set.intersection(related_candidates))
    if not matched_related:
        return 0.0, None

    related_skill = matched_related[0]
    # Related technologies help, but should never outweigh exact evidence.
    return 0.38, related_skill


def _clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    """Clamp numeric score to an inclusive range."""
    return max(lower, min(upper, value))


def compare_skills(resume_skills: list[str], job_skills: list[str], job_description: str = "") -> dict:
    """Compare resume/job skills and compute a weighted ATS score with breakdown."""
    resume_set = _normalized_set(resume_skills)
    job_set = _normalized_set(job_skills)

    matching = sorted(resume_set.intersection(job_set))
    missing = sorted(job_set - resume_set)

    if not job_set:
        return {
            "matching_skills": matching,
            "missing_skills": missing,
            "ats_score": 0.0,
            "partially_matching_skills": [],
            "priority_missing_skills": [],
            "ats_score_breakdown": {
                "exact_match_score": 0.0,
                "related_match_score": 0.0,
                "gap_penalty": 0.0,
                "breadth_bonus": 0.0,
                "total_required_weight": 0.0,
                "matched_required_weight": 0.0,
                "final_score": 0.0,
            },
        }

    weights = _build_skill_weights(job_set, job_description)
    total_weight = sum(weights.values()) or 1.0
    exact_matched_weight = sum(weights[skill] for skill in matching)

    partially_matching_skills: list[dict] = []
    partial_weight = 0.0
    for skill in missing:
        credit_ratio, related_skill = _partial_match_credit(skill, resume_set)
        if not credit_ratio or not related_skill:
            continue
        credit_weight = weights[skill] * credit_ratio
        partial_weight += credit_weight
        partially_matching_skills.append(
            {
                "job_skill": skill,
                "resume_skill": related_skill,
                "credit_ratio": round(credit_ratio, 2),
            }
        )

    # Avoid over-crediting "close enough" skills.
    partial_weight = min(partial_weight, total_weight * 0.3)

    exact_match_score = (exact_matched_weight / total_weight) * 100
    related_match_score = (partial_weight / total_weight) * 100

    priority_missing_skills = sorted([skill for skill in missing if skill in CRITICAL_SKILLS])
    missing_weight = total_weight - exact_matched_weight
    gap_penalty = ((missing_weight / total_weight) * 16.0) + (len(priority_missing_skills) * 2.5)
    gap_penalty = min(gap_penalty, 24.0)

    extra_skills = resume_set - job_set
    bonus_buckets = defaultdict(int)
    for skill in extra_skills:
        if skill in {"docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "system design"}:
            bonus_buckets["platform"] += 1
        if skill in {"pytest", "unit testing", "git", "linux"}:
            bonus_buckets["engineering"] += 1
        if skill in {"machine learning", "deep learning", "nlp", "data analysis"}:
            bonus_buckets["data"] += 1
    breadth_bonus = min(6.0, sum(min(count, 2) for count in bonus_buckets.values()) * 0.8)

    final_score = _clamp(exact_match_score + related_match_score + breadth_bonus - gap_penalty)

    return {
        "matching_skills": matching,
        "missing_skills": missing,
        "partially_matching_skills": partially_matching_skills,
        "priority_missing_skills": priority_missing_skills,
        "ats_score": round(final_score, 2),
        "ats_score_breakdown": {
            "exact_match_score": round(exact_match_score, 2),
            "related_match_score": round(related_match_score, 2),
            "gap_penalty": round(gap_penalty, 2),
            "breadth_bonus": round(breadth_bonus, 2),
            "total_required_weight": round(total_weight, 3),
            "matched_required_weight": round(exact_matched_weight, 3),
            "final_score": round(final_score, 2),
        },
    }
