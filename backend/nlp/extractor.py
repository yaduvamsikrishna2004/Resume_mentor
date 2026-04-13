"""NLP extraction helpers for resume and job description analysis."""

from __future__ import annotations

import re
from functools import lru_cache

import spacy
from spacy.language import Language
from spacy.matcher import PhraseMatcher

from nlp.skill_db import SKILL_DATABASE

EDUCATION_KEYWORDS = [
    "bachelor",
    "master",
    "phd",
    "b.tech",
    "m.tech",
    "b.e",
    "m.e",
    "mba",
    "bsc",
    "msc",
]


@lru_cache(maxsize=1)
def get_nlp() -> Language:
    """
    Load spaCy model once and fallback to lightweight tokenizer if model is missing.
    """
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        return spacy.blank("en")


@lru_cache(maxsize=1)
def get_skill_matcher() -> PhraseMatcher:
    """Create and cache a PhraseMatcher for skill extraction."""
    nlp = get_nlp()
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    skill_patterns = [nlp.make_doc(skill) for skill in SKILL_DATABASE]
    matcher.add("SKILLS", skill_patterns)
    return matcher


def normalize_whitespace(text: str) -> str:
    """Normalize noisy whitespace in extracted documents."""
    return re.sub(r"\s+", " ", text or "").strip()


def extract_skills(text: str) -> list[str]:
    """Extract known skills from text using phrase matching and word boundaries."""
    normalized = normalize_whitespace(text).lower()
    if not normalized:
        return []

    nlp = get_nlp()
    matcher = get_skill_matcher()
    doc = nlp(normalized)
    matches = matcher(doc)
    skills = {doc[start:end].text.lower() for _, start, end in matches}

    # Regex fallback catches skills in cases where tokenization misses punctuation variants.
    for skill in SKILL_DATABASE:
        escaped = re.escape(skill.lower())
        if re.search(rf"(?<!\w){escaped}(?!\w)", normalized):
            skills.add(skill.lower())

    return sorted(skills)


def extract_education(text: str) -> list[str]:
    """
    Heuristic extraction for education lines containing degree keywords.
    """
    normalized = normalize_whitespace(text)
    if not normalized:
        return []

    lines = re.split(r"[.;\n]", normalized)
    education_hits = []

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        lowered = line_clean.lower()
        if any(keyword in lowered for keyword in EDUCATION_KEYWORDS):
            education_hits.append(line_clean)

    return sorted(set(education_hits))


def extract_experience_years(text: str) -> float:
    """
    Estimate years of experience from phrases like "3 years" or "5+ years".
    Returns the maximum detected years as a simple baseline heuristic.
    """
    normalized = normalize_whitespace(text).lower()
    if not normalized:
        return 0.0

    matches = re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", normalized)
    if not matches:
        return 0.0

    values = [float(value) for value in matches]
    return max(values) if values else 0.0


def extract_resume_entities(text: str) -> dict:
    """Extract resume skills, education, and experience summary."""
    return {
        "skills": extract_skills(text),
        "education": extract_education(text),
        "experience_years": extract_experience_years(text),
    }


def extract_job_skills(job_description: str) -> list[str]:
    """Extract skills from a job description."""
    return extract_skills(job_description)
