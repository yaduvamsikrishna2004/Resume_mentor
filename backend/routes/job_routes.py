"""Job comparison and suggestion routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import ApiResponse, CompareJobRequest, MentorChatRequest, SuggestionRequest
from nlp.extractor import extract_job_skills, extract_resume_entities
from utils.analysis import compare_skills
from utils.mentor_chat import generate_mentor_reply_with_meta
from utils.resume_repository import get_resume_by_id
from utils.suggestions import generate_ai_suggestions_with_meta

router = APIRouter(tags=["analysis"])


@router.post("/compare_job", response_model=ApiResponse)
def compare_job(payload: CompareJobRequest) -> ApiResponse:
    """Compare extracted resume skills to job requirements."""
    try:
        resume_text = (payload.resume_text or "").strip()
        if payload.resume_id and not resume_text:
            document = get_resume_by_id(payload.resume_id)
            resume_text = document.get("raw_text", "")

        if not resume_text:
            raise ValueError("Provide either resume_id or resume_text.")

        job_description = payload.job_description.strip()
        if not job_description:
            raise ValueError("job_description cannot be empty.")

        resume_skills = extract_resume_entities(resume_text).get("skills", [])
        job_skills = extract_job_skills(job_description)
        comparison = compare_skills(resume_skills, job_skills, job_description)

        return ApiResponse(
            message="Skill gap analysis completed.",
            data={
                "resume_skills": resume_skills,
                "job_skills": job_skills,
                **comparison,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected comparison error: {exc}") from exc


@router.post("/get_suggestions", response_model=ApiResponse)
def get_suggestions(payload: SuggestionRequest) -> ApiResponse:
    """Generate recommendation list from missing skills."""
    try:
        missing_skills = [skill.strip().lower() for skill in payload.missing_skills if skill.strip()]
        suggestions, meta = generate_ai_suggestions_with_meta(
            {
                "missing_skills": missing_skills,
                "extra_context": payload.extra_context,
            }
        )

        return ApiResponse(
            message="Suggestions generated successfully.",
            data={"suggestions": suggestions, "meta": meta},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected suggestion error: {exc}") from exc


@router.post("/mentor_chat", response_model=ApiResponse)
def mentor_chat(payload: MentorChatRequest) -> ApiResponse:
    """Return a conversational mentor response powered by Gemini when available."""
    try:
        resume_text = (payload.resume_text or "").strip()
        if payload.resume_id and not resume_text:
            document = get_resume_by_id(payload.resume_id)
            resume_text = document.get("raw_text", "")

        reply, meta = generate_mentor_reply_with_meta(
            {
                "message": payload.message,
                "resume_text": resume_text,
                "chat_history": [item.model_dump() for item in payload.chat_history],
                "extra_context": payload.extra_context,
            }
        )
        return ApiResponse(
            message="Mentor response generated successfully.",
            data={"reply": reply, "meta": meta},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected mentor chat error: {exc}") from exc
