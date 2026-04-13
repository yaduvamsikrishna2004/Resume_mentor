"""MongoDB initialization and collection access utilities."""

from __future__ import annotations

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from utils.config import settings

_client: MongoClient | None = None
_collection: Collection | None = None


def initialize_mongo() -> None:
    """Initialize a shared MongoDB connection."""
    global _client, _collection

    if _client is not None and _collection is not None:
        return

    try:
        _client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=2500)
        db = _client[settings.mongo_db_name]
        _collection = db[settings.mongo_collection_name]
        # Trigger a quick server call early.
        _client.admin.command("ping")
    except PyMongoError as exc:
        _client = None
        _collection = None
        raise RuntimeError(f"MongoDB connection failed: {exc}") from exc


def get_resume_collection() -> Collection:
    """Return the resumes collection or raise if DB is unavailable."""
    if _collection is None:
        initialize_mongo()
    if _collection is None:
        raise RuntimeError("MongoDB collection is not initialized")
    return _collection
