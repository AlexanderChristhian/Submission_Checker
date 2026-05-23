from typing import Any
from concurrent.futures import ThreadPoolExecutor
from app.core.querying import retrieve_chunks
from app.core.neo4j_client import neo4j_client
from app.utils.logger import get_logger

logger = get_logger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)

RRF_K = 60
VECTOR_WEIGHT = 0.6
GRAPH_WEIGHT = 0.4


def _normalize_scores(items: list[dict], score_key: str) -> list[dict]:
    scores = [i[score_key] for i in items if i.get(score_key) is not None]
    if len(scores) < 2:
        return items
    min_s, max_s = min(scores), max(scores)
    if max_s == min_s:
        return items
    for item in items:
        raw = item.get(score_key)
        if raw is not None:
            item[f"{score_key}_norm"] = (raw - min_s) / (max_s - min_s)
        else:
            item[f"{score_key}_norm"] = 0.0
    return items


def _reciprocal_rank_fusion(rank_lists: list[list[dict]], k: int = RRF_K) -> list[dict]:
    scores: dict[str, float] = {}
    seen: dict[str, dict] = {}

    for rank_list in rank_lists:
        for rank, item in enumerate(rank_list):
            item_id = str(item.get("id", ""))
            if not item_id:
                continue
            scores[item_id] = scores.get(item_id, 0) + 1.0 / (k + rank + 1)
            if item_id not in seen:
                seen[item_id] = {**item, "fusion_score": 0.0}

    for item_id, fusion_score in scores.items():
        seen[item_id]["fusion_score"] = fusion_score

    merged = sorted(seen.values(), key=lambda x: x["fusion_score"], reverse=True)
    return merged


def _weighted_combination(vector_items: list[dict], graph_items: list[dict]) -> list[dict]:
    vector_lookup: dict[str, dict] = {}
    for item in _normalize_scores(vector_items, "score"):
        item_id = str(item.get("id", ""))
        if item_id:
            vector_lookup[item_id] = item

    graph_lookup: dict[str, dict] = {}
    for item in _normalize_scores(graph_items, "graph_score"):
        item_id = str(item.get("id", ""))
        if item_id:
            graph_lookup[item_id] = item

    all_ids = set(vector_lookup.keys()) | set(graph_lookup.keys())
    merged = []
    for item_id in all_ids:
        vec = vector_lookup.get(item_id, {})
        gr = graph_lookup.get(item_id, {})
        vec_norm = vec.get("score_norm", 0.0)
        gr_norm = gr.get("graph_score_norm", 0.0)
        combined = VECTOR_WEIGHT * vec_norm + GRAPH_WEIGHT * gr_norm
        merged.append({
            "id": item_id,
            "fusion_score": combined,
            "vector_score": vec.get("score"),
            "graph_score": gr.get("graph_score"),
            "text": vec.get("text"),
            "title": gr.get("title") or vec.get("title"),
            "source": "both" if item_id in vector_lookup and item_id in graph_lookup
                      else "vector" if item_id in vector_lookup
                      else "graph",
        })

    merged.sort(key=lambda x: x["fusion_score"], reverse=True)
    return merged


async def _graph_text_search(keyword: str, top_k: int) -> list[dict]:
    try:
        results = await neo4j_client.run_query(
            """MATCH (s:Submission)
               OPTIONAL MATCH (s)-[r:SIMILAR_TO]-(:Submission)
               WITH s, count(r) AS edge_count, coalesce(avg(r.score), 0) AS avg_score
               WHERE s.title CONTAINS $keyword OR edge_count > 0
               RETURN s.submissionId AS id,
                      s.title AS title,
                      s.status AS status,
                      edge_count,
                      avg_score AS graph_score
               ORDER BY graph_score DESC, edge_count DESC
               LIMIT $top_k""",
            {"keyword": keyword, "top_k": top_k},
        )
        return results
    except Exception as e:
        logger.warning("Graph text search failed: %s", e)
        return []


async def hybrid_search(
    query: str,
    top_k: int = 10,
    fusion: str = "rrf",
    alpha: float | None = None,
) -> dict:
    """Execute parallel vector + graph search and fuse results.

    Args:
        query: Search query string.
        top_k: Number of results to return.
        fusion: Fusion method — "rrf" (reciprocal rank fusion) or "weighted".
        alpha: Weight for vector results in weighted mode (default 0.6).

    Returns:
        dict with 'results' (fused list), 'vector_results', 'graph_results'.
    """
    global VECTOR_WEIGHT
    if alpha is not None:
        VECTOR_WEIGHT = alpha

    # 1. Vector search (ChromaDB) — run in thread pool to avoid blocking
    vector_future = _executor.submit(retrieve_chunks, query, top_k=top_k)
    vector_results = vector_future.result()

    # 2. Graph search (Neo4j)
    graph_results = await _graph_text_search(query, top_k=top_k)

    # 3. Normalize and format lists
    vector_list = [
        {
            "id": c["metadata"].get("submission_id"),
            "score": c["score"],
            "text": c["text"],
            "title": c["metadata"].get("title", ""),
        }
        for c in vector_results
        if c["metadata"].get("submission_id") is not None
    ]

    graph_list = [
        {
            "id": r["id"],
            "graph_score": r["graph_score"],
            "title": r.get("title", ""),
            "status": r.get("status", ""),
            "edge_count": r.get("edge_count", 0),
        }
        for r in graph_results
    ]

    # 4. Fusion
    if fusion == "rrf":
        fused = _reciprocal_rank_fusion([vector_list, graph_list], k=RRF_K)
    else:
        fused = _weighted_combination(vector_list, graph_list)

    # 5. Log summary
    logger.info(
        "Hybrid search: %d vector + %d graph → %d fused",
        len(vector_list), len(graph_list), len(fused),
        extra={"fusion": fusion, "top_k": top_k},
    )

    return {
        "results": fused[:top_k],
        "vector_results": vector_list,
        "graph_results": graph_list,
    }
