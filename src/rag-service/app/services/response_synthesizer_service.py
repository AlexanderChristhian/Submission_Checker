from dataclasses import dataclass

from app.core.prompts import RAG_QUERY_TEMPLATE
from app.core.llm import llm_service
from app.api.schemas import SourceSnippet
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SynthesizedResult:
    answer: str
    sources: list[SourceSnippet]


class ResponseSynthesizerService:
    """Service for synthesizing responses from retrieved chunks."""

    def synthesize_compact(
        self,
        query: str,
        chunks: list[dict],
    ) -> SynthesizedResult:
        """Synthesize response using compact mode - combine all chunks."""
        if not chunks:
            return SynthesizedResult(
                answer="No relevant content found.",
                sources=[]
            )

        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        sources = [
            SourceSnippet(
                text=c["text"],
                score=c["score"],
                submission_id=c["metadata"].get("submission_id")
            ) for c in chunks
        ]

        prompt = RAG_QUERY_TEMPLATE.format(context=context, query=query)
        
        try:
            answer = llm_service.generate(prompt)
        except Exception as e:
            logger.warning(f"LLM generation failed, returning context: {e}")
            answer = f"[Retrieved Context]\n\n{context}"

        return SynthesizedResult(answer=answer, sources=sources)

    def synthesize_refine(
        self,
        query: str,
        chunks: list[dict],
    ) -> SynthesizedResult:
        """Synthesize response using refine mode - iterative improvement."""
        if not chunks:
            return SynthesizedResult(
                answer="No relevant content found.",
                sources=[]
            )

        sources = [
            SourceSnippet(
                text=c["text"],
                score=c["score"],
                submission_id=c["metadata"].get("submission_id")
            ) for c in chunks
        ]

        answer = None
        
        for i, chunk in enumerate(chunks):
            chunk_context = chunk["text"]
            
            if answer is None:
                prompt = RAG_QUERY_TEMPLATE.format(
                    context=chunk_context,
                    query=query
                )
            else:
                refine_prompt = f"""Based on the existing answer: "{answer}"

And new context:
{chunk_context}

Question: {query}

Refine the answer to include information from the new context:"""
                prompt = refine_prompt

            try:
                answer = llm_service.generate(prompt)
            except Exception as e:
                logger.warning(f"LLM refine step {i+1} failed: {e}")
                if answer is None:
                    answer = chunk_context
                else:
                    answer += f"\n\n{chunk_context}"

        if answer is None:
            answer = "\n\n".join(c["text"] for c in chunks)

        return SynthesizedResult(answer=answer, sources=sources)
