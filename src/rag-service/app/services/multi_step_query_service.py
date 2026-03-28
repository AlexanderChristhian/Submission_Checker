from dataclasses import dataclass

from app.core.querying import retrieve_chunks
from app.core.retrievers import get_hybrid_retriever
from app.services.query_transform_service import QueryTransformService
from app.services.response_synthesizer_service import ResponseSynthesizerService, SynthesizedResult
from app.api.schemas import SourceSnippet
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class QueryResult:
    answer: str
    sources: list[SourceSnippet]
    sub_queries: list[str] | None = None
    transform_type: str | None = None


class MultiStepQueryService:
    """Multi-step query service with query transformation and response synthesis."""

    def __init__(
        self,
        use_hybrid: bool = False,
        synthesis_mode: str = "compact",
        num_queries: int = 1,
        fusion_mode: str = "reciprocal_rerank",
    ):
        self.use_hybrid = use_hybrid
        self.synthesis_mode = synthesis_mode
        self.num_queries = num_queries
        self.fusion_mode = fusion_mode
        self.query_transform = QueryTransformService()
        self.synthesizer = ResponseSynthesizerService()

    def query(
        self,
        query: str,
        submission_id: int | None = None,
        top_k: int = 5,
        enable_decomposition: bool = False,
    ) -> QueryResult:
        """Execute multi-step query with optional transformation."""
        
        transform_type = None
        sub_queries = None
        
        if enable_decomposition and self.query_transform.should_decompose(query):
            transform_type = "decomposition"
            sub_queries = self.query_transform.decompose_query(query)
            
            all_chunks = []
            for sq in sub_queries:
                if self.use_hybrid:
                    hybrid_retriever = get_hybrid_retriever(
                        fusion_top_k=top_k,
                        num_queries=self.num_queries,
                        fusion_mode=self.fusion_mode,
                    )
                    chunks = hybrid_retriever.retrieve_as_dicts(
                        sq,
                        submission_id=submission_id,
                        top_k=top_k
                    )
                else:
                    chunks = retrieve_chunks(
                        sq,
                        submission_id=submission_id,
                        top_k=top_k
                    )
                all_chunks.extend(chunks)
            
            unique_chunks = {}
            for chunk in all_chunks:
                key = (chunk["text"][:100], chunk["metadata"].get("submission_id"))
                if key not in unique_chunks:
                    unique_chunks[key] = chunk
            
            chunks = sorted(
                unique_chunks.values(),
                key=lambda x: x["score"],
                reverse=True
            )[:top_k]
        else:
            if self.use_hybrid:
                hybrid_retriever = get_hybrid_retriever(
                    fusion_top_k=top_k,
                    num_queries=self.num_queries,
                    fusion_mode=self.fusion_mode,
                )
                chunks = hybrid_retriever.retrieve_as_dicts(
                    query,
                    submission_id=submission_id,
                    top_k=top_k
                )
            else:
                chunks = retrieve_chunks(
                    query,
                    submission_id=submission_id,
                    top_k=top_k
                )

        if not chunks:
            return QueryResult(
                answer="No relevant content found.",
                sources=[],
                sub_queries=sub_queries,
                transform_type=transform_type
            )

        if self.synthesis_mode == "refine":
            result = self.synthesizer.synthesize_refine(query, chunks)
        else:
            result = self.synthesizer.synthesize_compact(query, chunks)

        logger.info(
            "Multi-step query completed",
            extra={
                "submission_id": submission_id,
                "transform_type": transform_type,
                "num_sources": len(result.sources)
            }
        )

        return QueryResult(
            answer=result.answer,
            sources=result.sources,
            sub_queries=sub_queries,
            transform_type=transform_type
        )


multi_step_service = MultiStepQueryService()
