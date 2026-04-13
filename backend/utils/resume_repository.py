"""Data-access layer for resume documents."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import PyMongoError

from utils.database import get_resume_collection

_memory_store: dict[str, dict] = {}


def insert_resume(filename: str, raw_text: str, extracted: dict) -> str:
    """Insert resume document and return its string id."""
    payload = {
        "filename": filename,
        "raw_text": raw_text,
        "extracted": extracted,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        collection = get_resume_collection()
    except RuntimeError:
        resume_id = f"mem-{uuid4().hex}"
        _memory_store[resume_id] = {"id": resume_id, **payload}
        return resume_id

    try:
        result = collection.insert_one(payload)
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to store resume: {exc}") from exc
    return str(result.inserted_id)


def get_resume_by_id(resume_id: str) -> dict:
    """Fetch a resume by Mongo id."""
    if resume_id.startswith("mem-"):
        document = _memory_store.get(resume_id)
        if not document:
            raise ValueError("Resume not found.")
        return document

    try:
        collection = get_resume_collection()
    except RuntimeError:
        raise ValueError("Resume not found.")

    try:
        document = collection.find_one({"_id": ObjectId(resume_id)})
    except InvalidId as exc:
        raise ValueError("Invalid resume_id format.") from exc
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to load resume: {exc}") from exc

    if not document:
        raise ValueError("Resume not found.")

    document["id"] = str(document["_id"])
    return document


def update_resume_analysis(resume_id: str, extracted: dict) -> None:
    """Update extracted summary for an existing resume."""
    if resume_id.startswith("mem-"):
        if resume_id in _memory_store:
            _memory_store[resume_id]["extracted"] = extracted
            _memory_store[resume_id]["updated_at"] = datetime.now(timezone.utc)
        return

    try:
        collection = get_resume_collection()
    except RuntimeError:
        return

    try:
        collection.update_one(
            {"_id": ObjectId(resume_id)},
            {
                "$set": {
                    "extracted": extracted,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    except (InvalidId, PyMongoError):
        # Non-critical write; fail silently for resilience.
        return
