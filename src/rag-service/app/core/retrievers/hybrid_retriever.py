from dataclasses import dataclass
from typing import Optional

from app.stores.chroma_store import get_collection
from app.core.embeddings import generate_embedding
from app.utils.logger import get_logger
from llama_index.core import Document
from llama_index.retrievers.bm25 import BM25Retriever as LlamaIndexBM25Retriever

logger = get_logger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    score: float
    metadata: dict


class HybridRetriever:
    """Hybrid retriever using QueryFusionRetriever.
    
    Combines vector (semantic) and BM25 (keyword) retrieval
    with query generation and reciprocal rank fusion.
    """

    def __init__(
        self,
        vector_top_k: int = 5,
        bm25_top_k: int = 5,
        fusion_top_k: int = 5,
        num_queries: int = 1,
        fusion_mode: str = "reciprocal_rerank",
        use_async: bool = True,
    ):
        self.vector_top_k = vector_top_k
        self.bm25_top_k = bm25_top_k
        self.fusion_top_k = fusion_top_k
        self.num_queries = num_queries
        self.fusion_mode = fusion_mode
        self.use_async = use_async
        self._fusion_retriever = None

    def _get_all_documents(
        self, 
        submission_id: Optional[int] = None
    ) -> tuple[list[str], list[dict]]:
        """Retrieve all documents from ChromaDB for BM25."""
        collection = get_collection()
        
        if submission_id is not None:
            results = collection.get(where={"submission_id": submission_id})
        else:
            results = collection.get()

        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])

        doc_texts = []
        doc_metas = []
        
        for doc, meta in zip(documents, metadatas):
            if doc and meta:
                doc_texts.append(doc)
                doc_metas.append(meta)

        return doc_texts, doc_metas

    def _create_fusion_retriever(
        self, 
        submission_id: Optional[int] = None
    ):
        """Create QueryFusionRetriever combining vector and BM25."""
        from llama_index.core.retrievers import QueryFusionRetriever
        from llama_index.core import QueryBundle
        
        doc_texts, doc_metas = self._get_all_documents(submission_id)
        
        if not doc_texts:
            logger.warning("No documents found for hybrid retrieval")
            return None

        vector_retriever = _create_vector_retriever(
            doc_texts, 
            doc_metas, 
            self.vector_top_k
        )
        
        bm25_retriever = _create_bm25_retriever(
            doc_texts,
            doc_metas,
            self.bm25_top_k
        )

        fusion_retriever = QueryFusionRetriever(
            [vector_retriever, bm25_retriever],
            similarity_top_k=self.fusion_top_k,
            num_queries=self.num_queries,
            mode=self.fusion_mode,
            use_async=self.use_async,
            verbose=False,
        )
        
        return fusion_retriever

    def retrieve(
        self,
        query: str,
        submission_id: Optional[int] = None,
        top_k: Optional[int] = None,
    ) -> list[RetrievedChunk]:
        """Perform hybrid search using QueryFusionRetriever.

        Args:
            query: The search query text.
            submission_id: Optional filter by submission.
            top_k: Number of results to return.

        Returns:
            List of RetrievedChunk objects.
        """
        fusion_retriever = self._create_fusion_retriever(submission_id)
        
        if fusion_retriever is None:
            return []

        k = top_k or self.fusion_top_k
        
        try:
            from llama_index.core import QueryBundle
            query_bundle = QueryBundle(query_str=query)
            
            nodes = fusion_retriever.retrieve(query_bundle)
            
            chunks = []
            for node in nodes[:k]:
                chunks.append(RetrievedChunk(
                    text=node.node.text,
                    score=node.score,
                    metadata=node.node.metadata or {}
                ))

            logger.info(
                "Hybrid retriever (QueryFusion): retrieved %d chunks",
                len(chunks),
                extra={
                    "submission_id": submission_id,
                    "num_queries": self.num_queries,
                    "fusion_mode": self.fusion_mode,
                }
            )
            return chunks
            
        except Exception as e:
            logger.error(f"Hybrid retrieval failed: {e}")
            return []

    def retrieve_as_dicts(
        self,
        query: str,
        submission_id: Optional[int] = None,
        top_k: Optional[int] = None,
    ) -> list[dict]:
        """Retrieve as list of dicts (for compatibility)."""
        chunks = self.retrieve(query, submission_id, top_k)
        return [
            {
                "text": c.text,
                "score": c.score,
                "metadata": c.metadata,
            }
            for c in chunks
        ]


def _create_vector_retriever(
    documents: list[str],
    metadatas: list[dict],
    top_k: int,
):
    """Create a vector retriever for the given documents."""
    from llama_index.core import Document, VectorStoreIndex
    from llama_index.core import StorageContext
    from llama_index.vector_stores.chroma import ChromaVectorStore
    import chromadb

    docs = [
        Document(text=text, metadata=meta)
        for text, meta in zip(documents, metadatas)
    ]

    db = chromadb.Client()
    collection = db.get_or_create_collection("temp_hybrid")
    
    chroma_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=chroma_store)
    
    index = VectorStoreIndex.from_documents(
        docs, 
        storage_context=storage_context,
        show_progress=False,
    )
    
    return index.as_retriever(similarity_top_k=top_k)


def _create_bm25_retriever(
    documents: list[str],
    metadatas: list[dict],
    top_k: int,
):
    """Create a BM25 retriever for the given documents."""

    docs = [
        Document(text=text, metadata=meta)
        for text, meta in zip(documents, metadatas)
    ]

    return LlamaIndexBM25Retriever.from_defaults(
        nodes=docs,
        similarity_top_k=top_k,
    )


def get_hybrid_retriever(
    vector_top_k: int = 5,
    bm25_top_k: int = 5,
    fusion_top_k: int = 5,
    num_queries: int = 1,
    fusion_mode: str = "reciprocal_rerank",
) -> HybridRetriever:
    """Factory function to create a HybridRetriever.
    
    Args:
        vector_top_k: Top k results from vector search.
        bm25_top_k: Top k results from BM25 search.
        fusion_top_k: Final top k after fusion.
        num_queries: Number of queries to generate (1 = disabled).
        fusion_mode: "reciprocal_rerank", "dist_based_score", or "relative_score".
    
    Returns:
        HybridRetriever instance.
    """
    return HybridRetriever(
        vector_top_k=vector_top_k,
        bm25_top_k=bm25_top_k,
        fusion_top_k=fusion_top_k,
        num_queries=num_queries,
        fusion_mode=fusion_mode,
    )
