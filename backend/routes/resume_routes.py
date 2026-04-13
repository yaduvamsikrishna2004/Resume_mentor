"""Resume upload and analysis routes."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import AnalyzeResumeRequest, ApiResponse
from nlp.extractor import extract_resume_entities
from utils.file_parser import parse_uploaded_resume
from utils.resume_repository import get_resume_by_id, insert_resume, update_resume_analysis

router = APIRouter(tags=["resume"])


@router.post("/upload_resume", response_model=ApiResponse)
async def upload_resume(file: UploadFile = File(...)) -> ApiResponse:
    """Upload resume file, extract text, and persist to MongoDB."""
    try:
        raw_text = await parse_uploaded_resume(file)
        extracted = extract_resume_entities(raw_text)
        resume_id = insert_resume(file.filename or "resume", raw_text, extracted)
        return ApiResponse(
            message="Resume uploaded successfully.",
            data={
                "resume_id": resume_id,
                "filename": file.filename,
                "raw_text_preview": raw_text[:500],
                "extracted": extracted,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected upload error: {exc}") from exc


@router.post("/analyze_resume", response_model=ApiResponse)
def analyze_resume(payload: AnalyzeResumeRequest) -> ApiResponse:
    """Analyze resume text from input payload or stored resume document."""
    resume_text = (payload.resume_text or "").strip()
    resume_id = payload.resume_id

    try:
        if resume_id and not resume_text:
            document = get_resume_by_id(resume_id)
            resume_text = document.get("raw_text", "")

        if not resume_text:
            raise ValueError("Provide either resume_id or resume_text.")

        extracted = extract_resume_entities(resume_text)
        if resume_id:
            update_resume_analysis(resume_id, extracted)

        return ApiResponse(
            message="Resume analyzed successfully.",
            data={
                "resume_id": resume_id,
                "analysis": extracted,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected analysis error: {exc}") from exc
