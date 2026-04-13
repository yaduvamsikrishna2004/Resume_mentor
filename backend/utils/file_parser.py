"""File parsing utilities for PDF and DOCX resumes."""

from __future__ import annotations

import io
import os
import tempfile

import docx2txt
from fastapi import UploadFile
from PyPDF2 import PdfReader

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def validate_extension(filename: str) -> str:
    """Validate upload extension and return normalized extension."""
    extension = os.path.splitext(filename.lower())[1]
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Please upload PDF or DOCX.")
    return extension


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes."""
    reader = PdfReader(io.BytesIO(file_bytes))
    content = []
    for page in reader.pages:
        content.append(page.extract_text() or "")
    return "\n".join(content).strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract plain text from DOCX bytes using temporary file."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name

    try:
        return (docx2txt.process(temp_path) or "").strip()
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def parse_uploaded_resume(upload_file: UploadFile) -> str:
    """Parse uploaded resume and return extracted text."""
    if not upload_file.filename:
        raise ValueError("File name is missing.")

    extension = validate_extension(upload_file.filename)
    file_bytes = await upload_file.read()
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    if extension == ".pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
    else:
        extracted_text = extract_text_from_docx(file_bytes)

    if not extracted_text.strip():
        raise ValueError("No readable text found in uploaded file.")

    return extracted_text
