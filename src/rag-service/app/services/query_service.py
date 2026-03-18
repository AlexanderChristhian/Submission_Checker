from dataclasses import dataclass

from app.api.schemas import SourceSnippet
from app.core.querying import retrieve_chunks
from app.core.prompts import RAG_QUERY_TEMPLATE
from app.core.llm import llm_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


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

        # 3. Generate answer using LLM
        prompt = RAG_QUERY_TEMPLATE.format(context=context, query=query)
        
        try:
            answer = llm_service.generate(prompt)
        except Exception as e:
            logger.warning(f"LLM generation failed, falling back to context: {e}")
            answer = f"[RAG Context Retrieved]\n\n{context}"

        logger.info(
            "Query completed with %d sources",
            len(sources),
            extra={"submission_id": submission_id},
        )

        return QueryResult(answer=answer, sources=sources)
