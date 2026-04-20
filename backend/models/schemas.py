"""Shared request and response schemas for API endpoints."""

from typing import Any

from pydantic import BaseModel, Field


class AnalyzeResumeRequest(BaseModel):
    """Request payload for resume analysis."""

    resume_id: str | None = Field(default=None, description="Mongo document id of uploaded resume")
    resume_text: str | None = Field(default=None, description="Raw resume text")


class CompareJobRequest(BaseModel):
    """Request payload for resume/job comparison."""

    job_description: str = Field(..., min_length=10, description="Target role job description")
    resume_id: str | None = Field(default=None, description="Mongo document id of uploaded resume")
    resume_text: str | None = Field(default=None, description="Raw resume text")


class SuggestionRequest(BaseModel):
    """Request payload for suggestion generation."""

    missing_skills: list[str] = Field(default_factory=list, description="Skills missing in resume")
    extra_context: dict[str, Any] = Field(default_factory=dict, description="Optional context")


class ChatMessage(BaseModel):
    """Single chat message item for mentor context."""

    role: str = Field(..., description="Role in chat thread: user or assistant")
    content: str = Field(..., min_length=1, description="Message text")


class MentorChatRequest(BaseModel):
    """Request payload for Gemini mentor chat responses."""

    message: str = Field(..., min_length=1, description="User message for mentor chat")
    resume_id: str | None = Field(default=None, description="Mongo document id of uploaded resume")
    resume_text: str | None = Field(default=None, description="Raw resume text")
    chat_history: list[ChatMessage] = Field(default_factory=list, description="Recent chat history")
    extra_context: dict[str, Any] = Field(default_factory=dict, description="Optional structured context")


class ChatApiRequest(BaseModel):
    """Request payload for the production chat endpoint."""

    message: str = Field(..., min_length=1, description="User message for AI chat")
    resume_id: str | None = Field(default=None, description="Mongo document id of uploaded resume")
    resume_text: str | None = Field(default=None, description="Raw resume text")
    resume_context: dict[str, Any] = Field(default_factory=dict, description="Structured resume context and insights")
    chat_history: list[ChatMessage] = Field(default_factory=list, description="Recent chat history")


class ApiResponse(BaseModel):
    """Standardized API response wrapper."""

    success: bool = True
    message: str = "ok"
    data: dict[str, Any] = Field(default_factory=dict)
