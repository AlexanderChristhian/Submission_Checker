from dataclasses import dataclass

from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    score: float
    metadata: dict


class BM25Retriever:
    """BM25-based keyword retriever using rank_bm25."""

    def __init__(self, top_k: int = 5):
        self.top_k = top_k

    def _get_all_documents(
        self, 
        submission_id: int | None = None
    ) -> tuple[list[str], list[dict]]:
        """Retrieve all documents from ChromaDB for BM25 indexing."""
        collection = get_collection()
        
        if submission_id is not None:
            results = collection.get(where={"submission_id": submission_id})
        else:
            results = collection.get()

        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])

        doc_texts = []
        doc_metas = []
        
        for doc, meta in zip(documents, metadatas):
            if doc and meta:
                doc_texts.append(doc)
                doc_metas.append(meta)

        return doc_texts, doc_metas

    def retrieve(
        self,
        query: str,
        submission_id: int | None = None,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        """Perform BM25 keyword search.

        Args:
            query: The search query text.
            submission_id: Optional filter by submission.
            top_k: Number of results to return.

        Returns:
            List of RetrievedChunk objects.
        """
        try:
            from rank_bm25 import BM25Okapi
        except ImportError:
            logger.error("rank_bm25 not installed. Run: pip install rank-bm25")
            return []

        doc_texts, doc_metas = self._get_all_documents(submission_id)

        if not doc_texts:
            logger.info("No documents found for BM25 search")
            return []

        query_tokens = query.lower().split()
        
        bm25 = BM25Okapi(doc_texts)
        scores = bm25.get_scores(query_tokens)

        k = top_k or self.top_k
        top_indices = sorted(
            range(len(scores)), 
            key=lambda i: scores[i], 
            reverse=True
        )[:k]

        chunks = []
        max_score = max(scores[i] for i in top_indices) if top_indices else 1.0
        
        for idx in top_indices:
            if scores[idx] > 0:
                normalized_score = scores[idx] / max_score
                chunks.append(RetrievedChunk(
                    text=doc_texts[idx],
                    score=normalized_score,
                    metadata=doc_metas[idx] if idx < len(doc_metas) else {}
                ))

        logger.info(
            "BM25 retriever: retrieved %d chunks",
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


def get_bm25_retriever(top_k: int = 5) -> BM25Retriever:
    """Factory function to create a BM25Retriever."""
    return BM25Retriever(top_k=top_k)
