from dataclasses import dataclass

from app.core.querying import retrieve_chunks
from app.core.prompts import RAG_QUERY_TEMPLATE
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SourceSnippet:
    text: str
    score: float


@dataclass
class QueryResult:
    answer: str
    sources: list[SourceSnippet]


class QueryService:
    """Orchestrates RAG queries: retrieve relevant chunks → build context → generate answer."""

    def query(self, submission_id: int, query: str) -> QueryResult:
        """Run a RAG query against a specific submission's indexed chunks."""
        # 1. Retrieve relevant chunks from ChromaDB
        chunks = retrieve_chunks(query, submission_id=submission_id, top_k=5)

        if not chunks:
            return QueryResult(
                answer="No relevant content found for this submission.",
                sources=[],
            )

        # 2. Build context from retrieved chunks
        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        sources = [
            SourceSnippet(text=c["text"], score=c["score"]) for c in chunks
        ]

        # 3. Format prompt (LLM call is a TODO — return context-based answer for now)
        prompt = RAG_QUERY_TEMPLATE.format(context=context, query=query)

        # TODO: Call LLM (OpenAI / Ollama) with the prompt
        # For now, return the retrieved context as the answer
        answer = f"[RAG Context Retrieved]\n\n{prompt}"

        logger.info(
            "Query completed with %d sources",
            len(sources),
            extra={"submission_id": submission_id},
        )

        return QueryResult(answer=answer, sources=sources)
