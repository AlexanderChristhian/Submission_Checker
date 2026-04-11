"""Custom LlamaIndex embedding class that wraps the existing BGE-M3 model."""

from typing import Any, List
from llama_index.core.embeddings import BaseEmbedding
from pydantic import Field, PrivateAttr

from app.core.embeddings import get_embedding_model
from app.utils.logger import get_logger

logger = get_logger(__name__)


class BGEM3Embedding(BaseEmbedding):
    """Custom LlamaIndex embedding class for BGE-M3 model.
    
    This wraps the existing BGEM3FlagModel from FlagEmbedding
    to be compatible with LlamaIndex's embedding interface.
    """
    
    model_name: str = Field(default="BAAI/bge-m3", description="BGE-M3 model name")
    use_fp16: bool = Field(default=True, description="Whether to use FP16")
    
    _model: Any = PrivateAttr()
    _initialized: bool = PrivateAttr(default=False)
    
    def __init__(self, **data: Any):
        super().__init__(**data)
        try:
            self._model = get_embedding_model()
            self._initialized = True
            logger.info(f"BGEM3Embedding initialized with model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize BGEM3Embedding: {e}")
            raise
    
    @classmethod
    def class_name(cls) -> str:
        return "BGEM3Embedding"
    
    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not self._initialized:
            raise RuntimeError("BGEM3Embedding not properly initialized")
        
        try:
            output = self._model.encode(texts)
            # BGE-M3 encode() returns dict with 'dense_vecs' key
            return output["dense_vecs"].tolist()
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    def _get_query_embedding(self, query: str) -> List[float]:
        """Get embedding for a single query."""
        return self._embed([query])[0]
    
    def _get_text_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text."""
        return self._embed([text])[0]
    
    def _get_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts."""
        return self._embed(texts)

    async def _aget_query_embedding(self, query: str) -> List[float]:
        """Async get embedding for a single query."""
        return self._get_query_embedding(query)

    async def _aget_text_embedding(self, text: str) -> List[float]:
        """Async get embedding for a single text."""
        return self._get_text_embedding(text)

    async def _aget_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Async get embeddings for multiple texts."""
        return self._get_text_embeddings(texts)