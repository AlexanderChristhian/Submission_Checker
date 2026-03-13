from dataclasses import dataclass

from app.core.indexing import chunk_document
from app.core.embeddings import generate_embeddings
from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class IndexResult:
    chunk_count: int
    submission_id: int


class IndexService:
    """Manages the indexing pipeline: chunk → embed → store in ChromaDB."""

    def index(self, submission_id: int, content: str) -> IndexResult:
        """Chunk a document, embed it with BGE-M3, and store in ChromaDB."""
        # 1. Chunk the document
        chunks = chunk_document(content, submission_id)

        if not chunks:
            raise ValueError(f"No chunks produced for submission {submission_id}")

        # 2. Generate embeddings for all chunks
        texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(texts)

        # 3. Store in ChromaDB
        collection = get_collection()
        ids = [f"sub-{submission_id}-chunk-{i}" for i in range(len(chunks))]
        metadatas = [c["metadata"] for c in chunks]

        collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        logger.info(
            "Indexed %d chunks for submission %d",
            len(chunks),
            submission_id,
            extra={"submission_id": submission_id},
        )

        return IndexResult(chunk_count=len(chunks), submission_id=submission_id)

    def delete(self, submission_id: int) -> None:
        """Remove all chunks for a submission from ChromaDB."""
        collection = get_collection()
        # Delete by metadata filter
        collection.delete(where={"submission_id": submission_id})

        logger.info(
            "Deleted chunks for submission %d",
            submission_id,
            extra={"submission_id": submission_id},
        )
