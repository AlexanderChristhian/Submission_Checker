from functools import lru_cache

import chromadb

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.ClientAPI:
    """Create persistent ChromaDB client once."""
    logger.info("Initializing ChromaDB at: %s", settings.chroma_db_path)
    return chromadb.PersistentClient(path=settings.chroma_db_path)


def get_collection(name: str | None = None) -> chromadb.Collection:
    """Get or create a ChromaDB collection."""
    client = get_chroma_client()
    collection_name = name or settings.chroma_collection_name
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
