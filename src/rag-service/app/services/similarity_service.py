from app.core.embeddings import generate_embedding
from app.stores.chroma_store import get_collection
from app.api.schemas import SimilarityMatch
from app.utils.logger import get_logger

logger = get_logger(__name__)


def find_similar_submissions(text: str, top_k: int = 10) -> list[SimilarityMatch]:
    """Find submissions most similar to a given text using vector similarity.

    Args:
        text: The text to compare against indexed submissions.
        top_k: Number of top matches to return.

    Returns:
        List of SimilarityMatch with submission_id, score, and matched text.
    """
    collection = get_collection()

    query_embedding = generate_embedding(text)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k * 2,
    )

    seen: dict[int, SimilarityMatch] = {}
    result_documents = results.get("documents", [[]])[0]
    result_distances = results.get("distances", [[]])[0]
    result_metadatas = results.get("metadatas", [[]])[0]

    for doc, distance, meta in zip(
        result_documents, result_distances, result_metadatas
    ):
        submission_id = meta.get("submission_id")
        if submission_id is None:
            continue

        score = 1.0 - (distance / 2.0)

        if submission_id not in seen or score > seen[submission_id].score:
            seen[submission_id] = SimilarityMatch(
                submission_id=submission_id,
                score=round(score, 4),
                title=f"Submission #{submission_id}",
                matched_text=doc[:200] + "..." if len(doc) > 200 else doc,
            )

    matches = sorted(seen.values(), key=lambda m: m.score, reverse=True)[:top_k]

    logger.info("Found %d similar submissions for query text", len(matches))
    return matches
