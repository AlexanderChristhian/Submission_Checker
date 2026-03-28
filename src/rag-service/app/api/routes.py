import tempfile
import os
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from app.api.schemas import (
    IndexTextRequest,
    IndexResponse,
    QueryRequest,
    QueryResponse,
    SimilarityRequest,
    SimilarityResponse,
    DeleteRequest,
    HealthResponse,
    SourceSnippet,
    HybridQueryRequest,
    MultiStepQueryRequest,
    MultiStepQueryResponse,
)
from app.services import index_service
from app.services.document_service import DocumentService
from app.services.similarity_service import find_similar_submissions
from app.services.multi_step_query_service import MultiStepQueryService
from app.core.retrievers import get_hybrid_retriever
from app.core.querying import retrieve_chunks
from app.core.prompts import RAG_QUERY_TEMPLATE
from app.core.llm import llm_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["Indexing", "Query", "Similarity", "Health"])

document_service = DocumentService()
multi_step_service = MultiStepQueryService()


# ═══════════════════════════════════════════════════════════════════
# INDEXING ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.post("/index/file", response_model=IndexResponse)
async def index_document_file(
    submission_id: int = Form(...),
    file: UploadFile = File(...)
):
    """Load file, chunk, embed, and store in ChromaDB."""
    temp_file_path = ""
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_file_path = tmp.name

        documents = document_service.load_document(temp_file_path, submission_id)
        result = index_service.index_file(documents, submission_id)
        return IndexResponse(status="indexed", chunks=result["chunk_count"])
    except Exception as e:
        logger.error("File indexing failed", extra={"submission_id": submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"File indexing failed: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.post("/index", response_model=IndexResponse)
async def index_document(request: IndexTextRequest):
    """Chunk, embed, and store a raw string document in ChromaDB."""
    try:
        result = index_service.index_text(request.content, request.submission_id)
        return IndexResponse(status="indexed", chunks=result["chunk_count"])
    except Exception as e:
        logger.error("Indexing failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Indexing failed: {e}")


@router.delete("/index")
async def delete_document(request: DeleteRequest):
    """Remove a document's embeddings from ChromaDB."""
    try:
        index_service.delete_submission(request.submission_id)
        return {"status": "deleted", "submission_id": request.submission_id}
    except Exception as e:
        logger.error("Delete failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# QUERY ROUTES - RAG Style (with LLM synthesis)
# ═══════════════════════════════════════════════════════════════════

@router.post("/query/rag", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Search all indexed documents and generate answer using LLM."""
    try:
        chunks = retrieve_chunks(request.query, top_k=request.top_k)

        if not chunks:
            return QueryResponse(
                answer="No relevant content found in the knowledge base.",
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

        prompt = RAG_QUERY_TEMPLATE.format(context=context, query=request.query)
        try:
            answer = llm_service.generate(prompt)
        except Exception as e:
            logger.warning(f"LLM generation failed, falling back to context: {e}")
            answer = f"[RAG Context Retrieved]\n\n{context}"

        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        logger.error("RAG query failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"RAG query failed: {e}")


@router.post("/query/search", response_model=QueryResponse)
async def query_search(request: QueryRequest):
    """Search all indexed documents and return raw results (no LLM)."""
    try:
        chunks = retrieve_chunks(request.query, top_k=request.top_k)

        if not chunks:
            return QueryResponse(
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

        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        answer = f"[Search Results - {len(sources)} matches found]\n\n{context}"

        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        logger.error("Search query failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Search query failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# SIMILARITY ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.post("/similar", response_model=SimilarityResponse)
async def find_similar(request: SimilarityRequest):
    """Find submissions most similar to the given text."""
    try:
        matches = find_similar_submissions(request.text, request.top_k)
        return SimilarityResponse(matches=matches)
    except Exception as e:
        logger.error("Similarity search failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Similarity search failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# HYBRID SEARCH ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.post("/query/hybrid", response_model=QueryResponse)
async def query_hybrid(request: HybridQueryRequest):
    """Hybrid search combining vector and BM25 retrieval using QueryFusionRetriever."""
    try:
        service = get_hybrid_retriever(
            vector_top_k=request.top_k,
            bm25_top_k=request.top_k,
            fusion_top_k=request.top_k,
            num_queries=request.num_queries,
            fusion_mode=request.fusion_mode,
        )
        
        chunks = service.retrieve_as_dicts(request.query, top_k=request.top_k)

        if not chunks:
            return QueryResponse(
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

        prompt = RAG_QUERY_TEMPLATE.format(context=context, query=request.query)
        try:
            answer = llm_service.generate(prompt)
        except Exception as e:
            logger.warning(f"LLM generation failed, falling back to context: {e}")
            answer = f"[Hybrid Search Results - {len(sources)} matches]\n\n{context}"

        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        logger.error("Hybrid query failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Hybrid query failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# MULTI-STEP QUERY ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.post("/query/multi-step", response_model=MultiStepQueryResponse)
async def query_multi_step(request: MultiStepQueryRequest):
    """Multi-step query with query transformation and response synthesis."""
    try:
        service = MultiStepQueryService(
            use_hybrid=request.use_hybrid,
            synthesis_mode=request.synthesis_mode,
            num_queries=request.num_queries,
            fusion_mode=request.fusion_mode,
        )

        result = service.query(
            query=request.query,
            top_k=request.top_k,
            enable_decomposition=request.enable_decomposition,
        )

        return MultiStepQueryResponse(
            answer=result.answer,
            sources=result.sources,
            sub_queries=result.sub_queries,
            transform_type=result.transform_type,
        )
    except Exception as e:
        logger.error("Multi-step query failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Multi-step query failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# UTILITY ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")
