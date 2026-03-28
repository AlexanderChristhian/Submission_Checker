import logging

from app.core.llm import llm_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


class QueryTransformService:
    """Service for transforming queries into sub-queries."""

    DECOMPOSITION_PROMPT = """Break down this complex question into simpler sub-questions that can be answered independently.
Return each sub-question on a new line.

Original question: {query}

Sub-questions:"""

    def decompose_query(self, query: str) -> list[str]:
        """Decompose a complex query into sub-questions."""
        prompt = self.DECOMPOSITION_PROMPT.format(query=query)
        
        try:
            response = llm_service.generate(prompt)
            sub_queries = [
                line.strip()
                for line in response.split("\n")
                if line.strip() and "?" in line
            ]
            
            if not sub_queries:
                sub_queries = [query]
                
            logger.info("Decomposed query into %d sub-queries", len(sub_queries))
            return sub_queries
            
        except Exception as e:
            logger.warning(f"LLM query decomposition failed, using original: {e}")
            return [query]

    def should_decompose(self, query: str) -> bool:
        """Determine if query needs decomposition."""
        decomposition_indicators = [
            "compare", "difference", "vs", "versus",
            "both", "and", "or", "which is better",
            "pros", "cons", "advantages", "disadvantages",
            "how does", "relationship between",
        ]
        
        query_lower = query.lower()
        return any(indicator in query_lower for indicator in decomposition_indicators)
