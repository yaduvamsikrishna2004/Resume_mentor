"""FastAPI application entrypoint for AI Resume Mentor backend."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.job_routes import router as job_router
from routes.resume_routes import router as resume_router
from utils.database import initialize_mongo

logger = logging.getLogger(__name__)


app = FastAPI(
    title="AI Resume Mentor & Skill Gap Analyzer API",
    version="1.0.0",
    description="Backend API for resume parsing, skill-gap analysis, and suggestions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)
app.include_router(job_router)


@app.on_event("startup")
def on_startup() -> None:
    """Initialize shared resources."""
    try:
        initialize_mongo()
    except RuntimeError as exc:
        logger.warning("MongoDB initialization skipped: %s", exc)


@app.get("/health")
def health_check() -> dict:
    """Liveness check endpoint."""
    return {"status": "ok", "service": "resume-mentor-api"}
