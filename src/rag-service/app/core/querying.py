from app.core.embeddings import generate_embedding
from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


def retrieve_chunks(
    query: str, submission_id: int | None = None, top_k: int = 5
) -> list[dict]:
    """Retrieve the most relevant chunks from ChromaDB for a given query.

    Args:
        query: The search query text.
        submission_id: If set, restrict results to this submission.
        top_k: Number of top results to return.

    Returns:
        List of dicts with 'text', 'score', 'metadata' keys.
    """
    collection = get_collection()
    query_embedding = generate_embedding(query)

    where_filter = (
        {"submission_id": submission_id} if submission_id is not None else None
    )

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter,
    )

    chunks = []
    documents = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    for doc, distance, meta in zip(documents, distances, metadatas):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity score: 1 - (distance / 2)
        score = 1.0 - (distance / 2.0)
        chunks.append({"text": doc, "score": score, "metadata": meta})

    logger.info(
        "Retrieved %d chunks for query",
        len(chunks),
        extra={"submission_id": submission_id},
    )
    return chunks
