from app.core.neo4j_client import neo4j_client
from app.core.llm import llm_service
from app.services.hybrid_graph_search import hybrid_search
from app.utils.logger import get_logger

logger = get_logger(__name__)

GRAPHRAG_QUERY_TEMPLATE = """
Use the following context to answer the question.

── Vector Context (from ChromaDB) ──
{vector_context}

── Graph Context (from Neo4j) ──
{graph_context}

The graph context shows how submissions relate to each other (similarity edges) and their authors/assignments.
Use it to explain relationships between submissions where relevant.

Question: {query}

Answer:
"""


def _format_graph_context(graph_data: list[dict]) -> str:
    if not graph_data:
        return "No graph relationships found."

    lines: list[str] = []
    for item in graph_data:
        title = item.get("title", "Unknown")
        author = item.get("author") or "Unknown"
        assignment = item.get("assignment") or "Unassigned"
        similar = item.get("similar") or []

        parts = [f"- Submission: \"{title}\" (by {author}, for {assignment})"]

        if similar:
            related = []
            for sim in similar:
                sid = sim.get("submissionId")
                score = sim.get("score")
                if sid is not None and score is not None:
                    related.append(f"  → Similar to submission {sid} (score: {score:.2f})")
            parts.extend(related)

        lines.append("\n".join(parts))

    return "\n\n".join(lines)


async def graphrag_query(query: str, top_k: int = 5) -> dict:
    # 1. Hybrid search (vector + graph fusion)
    search_result = await hybrid_search(query, top_k=top_k, fusion="rrf")

    vector_chunks = search_result["vector_results"]
    graph_nodes = search_result["graph_results"]

    vector_context = "\n\n---\n\n".join(
        c["text"] for c in vector_chunks if c.get("text")
    )

    # 2. Deepen graph context: fetch similarity edges + author + assignment
    submission_ids: set[int] = set()
    for r in search_result["results"]:
        sid = r.get("id")
        if sid is not None:
            submission_ids.add(int(sid))

    graph_data: list[dict] = []
    for sid in submission_ids:
        try:
            results = await neo4j_client.run_query(
                """MATCH (s:Submission {submissionId: $sid})
                   OPTIONAL MATCH (s)-[r:SIMILAR_TO]-(other:Submission)
                   WHERE r.score >= 0.7
                   OPTIONAL MATCH (u:User)-[:SUBMITTED]->(s)
                   OPTIONAL MATCH (s)-[:FOR_ASSIGNMENT]->(a:Assignment)
                   RETURN s.title AS title,
                          s.status AS status,
                          collect(DISTINCT {
                              submissionId: other.submissionId,
                              score: r.score
                          }) AS similar,
                          u.name AS author,
                          a.title AS assignment
                   LIMIT 1""",
                {"sid": sid},
            )
            graph_data.extend(results)
        except Exception as e:
            logger.warning("Graph detail query failed for submission %s: %s", sid, e)

    # 3. Build enriched context
    graph_context = _format_graph_context(graph_data)

    # 4. LLM synthesis with both contexts
    prompt = GRAPHRAG_QUERY_TEMPLATE.format(
        vector_context=vector_context or "No vector results found.",
        graph_context=graph_context,
        query=query,
    )

    try:
        answer = llm_service.generate(prompt)
    except Exception as e:
        logger.warning("LLM generation failed, falling back to raw context: %s", e)
        answer = (
            f"[GraphRAG Results]\n\n"
            f"Fused results: {len(search_result['results'])} items\n"
            f"Graph matches: {len(graph_data)} submissions\n\n"
            f"{vector_context}"
        )

    return {
        "answer": answer,
        "chunks": vector_chunks,
        "graph_context": graph_data,
    }
