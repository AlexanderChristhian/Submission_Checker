from typing import Protocol
from dataclasses import dataclass

from app.stores.chroma_store import get_collection
from app.core.embeddings import generate_embedding
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    score: float
    metadata: dict


class VectorRetriever:
    """Vector-based retriever using ChromaDB embeddings."""

    def __init__(self, top_k: int = 5):
        self.top_k = top_k

    def retrieve(
        self,
        query: str,
        submission_id: int | None = None,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        """Perform vector similarity search.

        Args:
            query: The search query text.
            submission_id: Optional filter by submission.
            top_k: Number of results to return.

        Returns:
            List of RetrievedChunk objects.
        """
        collection = get_collection()
        query_embedding = generate_embedding(query)

        where_filter = (
            {"submission_id": submission_id} 
            if submission_id is not None 
            else None
        )

        k = top_k or self.top_k
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where=where_filter,
        )

        chunks = []
        documents = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        for doc, distance, meta in zip(documents, distances, metadatas):
            if doc:
                score = 1.0 - (distance / 2.0)
                chunks.append(RetrievedChunk(
                    text=doc, 
                    score=score, 
                    metadata=meta or {}
                ))

        logger.info(
            "Vector retriever: retrieved %d chunks",
            len(chunks),
            extra={"submission_id": submission_id}
        )
        return chunks

    def retrieve_as_dicts(
        self,
        query: str,
        submission_id: int | None = None,
        top_k: int | None = None,
    ) -> list[dict]:
        """Retrieve as list of dicts (for compatibility)."""
        chunks = self.retrieve(query, submission_id, top_k)
        return [
            {
                "text": c.text,
                "score": c.score,
                "metadata": c.metadata,
            }
            for c in chunks
        ]


def get_vector_retriever(top_k: int = 5) -> VectorRetriever:
    """Factory function to create a VectorRetriever."""
    return VectorRetriever(top_k=top_k)
