from app.core.embeddings import generate_embedding
from app.stores.chroma_store import get_collection
from app.api.schemas import SimilarityMatch
from app.utils.logger import get_logger

logger = get_logger(__name__)


class SimilarityService:
    """Finds submissions most similar to a given submission using vector similarity."""

    def find_similar(
        self, submission_id: int, top_k: int = 10
    ) -> list[SimilarityMatch]:
        """Find the most similar submissions by comparing embeddings in ChromaDB.

        Retrieves the submission's chunks, computes an average embedding,
        then queries across all submissions for the closest matches.
        """
        collection = get_collection()

        # 1. Get all chunks for this submission
        submission_docs = collection.get(
            where={"submission_id": submission_id},
            include=["documents"],
        )

        documents = submission_docs.get("documents", [])
        if not documents:
            logger.warning(
                "No indexed documents for submission %d", submission_id
            )
            return []

        # 2. Build a combined query from the submission's text
        combined_text = " ".join(documents[:3])  # Use first 3 chunks as representative
        query_embedding = generate_embedding(combined_text)

        # 3. Query ChromaDB for similar chunks across ALL submissions
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k * 3,  # Over-fetch to deduplicate per submission
            where={"submission_id": {"$ne": submission_id}},
        )

        # 4. Deduplicate by submission_id — keep best score per submission
        seen: dict[int, SimilarityMatch] = {}
        result_documents = results.get("documents", [[]])[0]
        result_distances = results.get("distances", [[]])[0]
        result_metadatas = results.get("metadatas", [[]])[0]

        for _doc, distance, meta in zip(
            result_documents, result_distances, result_metadatas
        ):
            other_id = meta.get("submission_id")
            if other_id is None:
                continue

            score = 1.0 - (distance / 2.0)

            if other_id not in seen or score > seen[other_id].score:
                seen[other_id] = SimilarityMatch(
                    submission_id=other_id,
                    score=round(score, 4),
                    title=f"Submission #{other_id}",
                )

        # 5. Sort by score descending, limit to top_k
        matches = sorted(seen.values(), key=lambda m: m.score, reverse=True)[
            :top_k
        ]

        logger.info(
            "Found %d similar submissions for submission %d",
            len(matches),
            submission_id,
            extra={"submission_id": submission_id},
        )

        return matches
