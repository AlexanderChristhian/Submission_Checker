import tempfile
import os
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from app.api.schemas import (
    IndexTextRequest,
    IndexResponse,
    QueryRequest,
    QueryResponse,
    SimilarityRequest,
    SimilarityResponse,
    DeleteRequest,
    HealthResponse,
)
from app.services.index_service import IndexService
from app.services.query_service import QueryService
from app.services.similarity_service import SimilarityService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

index_service = IndexService()
query_service = QueryService()
similarity_service = SimilarityService()

@router.post("/index/file", response_model=IndexResponse)
async def index_document_file(
    submission_id: int = Form(...),
    file: UploadFile = File(...)
):
    """Chunk, embed, and store a physical file document in ChromaDB."""
    temp_file_path = ""
    try:
        # Save file to a temporary location to pass to the DocumentService
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_file_path = tmp.name
        
        result = index_service.index_file(submission_id, temp_file_path)
        return IndexResponse(status="indexed", chunks=result.chunk_count)
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
        result = index_service.index_text(request.submission_id, request.content)
        return IndexResponse(status="indexed", chunks=result.chunk_count)
    except Exception as e:
        logger.error("Indexing failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Indexing failed: {e}")


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """RAG query against indexed documents."""
    try:
        result = query_service.query(request.submission_id, request.query)
        return QueryResponse(answer=result.answer, sources=result.sources)
    except Exception as e:
        logger.error("Query failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@router.post("/query/string", response_model=QueryResponse)
async def query_document_string(submission_id: int, query: str):
    """RAG query using String against indexed documents."""
    try:
        result = query_service.query(submission_id, query)
        return QueryResponse(answer=result.answer, sources=result.sources)
    except Exception as e:
        logger.error("Query failed", extra={"submission_id": submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@router.post("/similar", response_model=SimilarityResponse)
async def find_similar(request: SimilarityRequest):
    """Find documents most similar to a given submission."""
    try:
        matches = similarity_service.find_similar(
            request.submission_id, request.top_k
        )
        return SimilarityResponse(matches=matches)
    except Exception as e:
        logger.error("Similarity search failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Similarity search failed: {e}")


@router.delete("/index")
async def delete_document(request: DeleteRequest):
    """Remove a document's embeddings from ChromaDB."""
    try:
        index_service.delete(request.submission_id)
        return {"status": "deleted", "submission_id": request.submission_id}
    except Exception as e:
        logger.error("Delete failed", extra={"submission_id": request.submission_id, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")
