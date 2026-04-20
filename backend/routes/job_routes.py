"""Job comparison and suggestion routes."""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from models.schemas import (
    ApiResponse,
    ChatApiRequest,
    CompareJobRequest,
    ImproveResumeRequest,
    MentorChatRequest,
    SuggestionRequest,
)
from nlp.extractor import extract_job_skills, extract_resume_entities
from utils.analysis import compare_skills
from utils.mentor_chat import generate_mentor_reply_stream, generate_mentor_reply_with_meta, improve_resume_with_meta
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


@router.post("/api/chat")
def api_chat(payload: ChatApiRequest, request: Request):
    """Production chat endpoint for frontend chatbot integration."""
    try:
        document = None
        resume_text = (payload.resume_text or "").strip()
        if payload.resume_id and not resume_text:
            document = get_resume_by_id(payload.resume_id)
            resume_text = document.get("raw_text", "")

        if payload.resume_id and document is None:
            try:
                document = get_resume_by_id(payload.resume_id)
            except Exception:
                document = None

        extracted_skills = payload.resume_context.get("extracted_skills")
        if extracted_skills is None and document:
            extracted_skills = (document.get("extracted") or {}).get("skills", [])

        prompt_context = {
            **payload.resume_context,
            "resume_text": resume_text,
            "extracted_skills": extracted_skills or [],
            "ats_score": payload.resume_context.get("ats_score"),
            "job_description": payload.job_description or payload.resume_context.get("job_description", ""),
        }

        should_stream = payload.stream or "application/x-ndjson" in request.headers.get("accept", "")

        if should_stream:
            chunks, meta = generate_mentor_reply_stream(
                {
                    "message": payload.message,
                    "resume_text": resume_text,
                    "chat_history": [item.model_dump() for item in payload.chat_history],
                    "extra_context": prompt_context,
                }
            )

            def _iter_stream():
                started = time.perf_counter()
                yield json.dumps({"type": "meta", "data": {"status": "started", "message": "Analyzing your resume..."}}) + "\n"
                time.sleep(0.14)
                for chunk in chunks:
                    yield json.dumps({"type": "chunk", "delta": chunk}) + "\n"
                    time.sleep(0.018)
                yield json.dumps(
                    {
                        "type": "done",
                        "meta": {
                            **meta,
                            "stream_latency_ms": round((time.perf_counter() - started) * 1000, 2),
                        },
                    }
                ) + "\n"

            return StreamingResponse(_iter_stream(), media_type="application/x-ndjson")

        # Route resume_context into prompt context so Gemini answers are resume-specific.
        reply, meta = generate_mentor_reply_with_meta(
            {
                "message": payload.message,
                "resume_text": resume_text,
                "chat_history": [item.model_dump() for item in payload.chat_history],
                "extra_context": prompt_context,
            }
        )
        return ApiResponse(
            message="Chat response generated successfully.",
            data={"reply": reply, "meta": meta},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected chat error: {exc}") from exc


@router.post("/improve_resume", response_model=ApiResponse)
def improve_resume(payload: ImproveResumeRequest) -> ApiResponse:
    """Auto-improve resume bullets and return a version candidate."""
    try:
        resume_text = (payload.resume_text or "").strip()
        if payload.resume_id and not resume_text:
            document = get_resume_by_id(payload.resume_id)
            resume_text = document.get("raw_text", "")

        improved, meta = improve_resume_with_meta(
            {
                "resume_text": resume_text,
                "job_description": payload.job_description or "",
                "focus_areas": payload.focus_areas,
            }
        )
        return ApiResponse(
            message="Resume improvements generated successfully.",
            data={"improvement": improved, "meta": meta},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected improve_resume error: {exc}") from exc
