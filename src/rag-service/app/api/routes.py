import tempfile
import os
import json
import shutil
from typing import Any
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from pydantic import ValidationError
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
    GraphQueryRequest,
    GraphQueryResponse,
    GraphRAGRequest,
    GraphRAGResponse,
    HybridGraphSearchRequest,
    HybridGraphSearchResponse,
    HybridQueryRequest,
    MultiStepQueryRequest,
    MultiStepQueryResponse,
    VLMExtractRequest,
    VLMExtractFileRequest,
    VLMExtractResponse,
    VLMCompareRequest,
    VLMCompareResponse,
    VLMOCRIndexResponse,
)
from app.services import index_service
from app.services.document_service import DocumentService
from app.services.similarity_service import find_similar_submissions
from app.services.multi_step_query_service import MultiStepQueryService
from app.services.graphrag_service import graphrag_query
from app.services.hybrid_graph_search import hybrid_search
from app.services.vlm_service import VLMService
from app.core.vlm_constants import DEFAULT_VLM_PROVIDER
from app.core.retrievers import get_hybrid_retriever
from app.core.querying import retrieve_chunks
from app.core.prompts import RAG_QUERY_TEMPLATE
from app.core.llm import llm_service
from app.core.neo4j_client import neo4j_client
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["Indexing", "Query", "Similarity", "Health", "Graph", "VLM-OCR"])

document_service = DocumentService()
multi_step_service = MultiStepQueryService()

MAX_VLM_UPLOAD_BYTES = 20 * 1024 * 1024

_VLM_IMAGE_MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
}

_VLM_ALLOWED_IMAGE_MIME_TYPES = set(_VLM_IMAGE_MIME_BY_EXTENSION.values())


def _normalize_upload_mime_type(mime_type: str | None) -> str | None:
    if not mime_type:
        return None

    normalized = mime_type.split(";")[0].strip().lower()
    if normalized == "image/jpg":
        return "image/jpeg"
    return normalized or None


def _detect_image_mime_from_signature(signature: bytes) -> str | None:
    if signature.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if signature.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if signature.startswith(b"GIF87a") or signature.startswith(b"GIF89a"):
        return "image/gif"
    if signature.startswith(b"BM"):
        return "image/bmp"
    if signature.startswith(b"II*\x00") or signature.startswith(b"MM\x00*"):
        return "image/tiff"
    if len(signature) >= 12 and signature.startswith(b"RIFF") and signature[8:12] == b"WEBP":
        return "image/webp"
    return None


def _get_upload_size_bytes(file: UploadFile) -> int:
    file.file.seek(0, os.SEEK_END)
    size_bytes = file.file.tell()
    file.file.seek(0)
    return size_bytes


def _validate_vlm_upload_file(file: UploadFile) -> tuple[str, str, int]:
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=422, detail="Uploaded file must include a filename")

    suffix = os.path.splitext(filename)[1].lower()
    if suffix not in _VLM_IMAGE_MIME_BY_EXTENSION:
        allowed_extensions = ", ".join(sorted(_VLM_IMAGE_MIME_BY_EXTENSION.keys()))
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension '{suffix or 'none'}'. Allowed extensions: {allowed_extensions}",
        )

    declared_mime_type = _normalize_upload_mime_type(file.content_type)
    if declared_mime_type and declared_mime_type not in _VLM_ALLOWED_IMAGE_MIME_TYPES and declared_mime_type != "application/octet-stream":
        allowed_mime_types = ", ".join(sorted(_VLM_ALLOWED_IMAGE_MIME_TYPES))
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type '{declared_mime_type}'. Allowed MIME types: {allowed_mime_types}",
        )

    size_bytes = _get_upload_size_bytes(file)
    if size_bytes <= 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    if size_bytes > MAX_VLM_UPLOAD_BYTES:
        max_mb = MAX_VLM_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file is too large ({size_bytes} bytes). Maximum allowed size is {max_mb}MB",
        )

    signature = file.file.read(32)
    file.file.seek(0)
    detected_mime_type = _detect_image_mime_from_signature(signature)
    if detected_mime_type is None:
        raise HTTPException(
            status_code=415,
            detail="Uploaded file is not a recognized image format (jpeg/png/webp/gif/bmp/tiff)",
        )

    expected_mime_from_extension = _VLM_IMAGE_MIME_BY_EXTENSION[suffix]
    if expected_mime_from_extension != detected_mime_type:
        raise HTTPException(
            status_code=415,
            detail=(
                f"File extension '{suffix}' does not match file signature. "
                f"Detected MIME type is '{detected_mime_type}'"
            ),
        )

    if declared_mime_type and declared_mime_type not in {"application/octet-stream", detected_mime_type}:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Declared content type '{declared_mime_type}' does not match detected type "
                f"'{detected_mime_type}'"
            ),
        )

    return suffix, detected_mime_type, size_bytes


def _save_upload_to_temp_file(file: UploadFile, suffix: str) -> str:
    file.file.seek(0)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp, length=1024 * 1024)
        return tmp.name


def _to_indexable_ocr_text(data: Any) -> str:
    if data is None:
        return ""

    if isinstance(data, str):
        return data.strip()

    if isinstance(data, dict):
        parts: list[str] = []

        text_field = data.get("text")
        if isinstance(text_field, str) and text_field.strip():
            parts.append(text_field.strip())
        elif isinstance(text_field, list):
            for item in text_field:
                if isinstance(item, str) and item.strip():
                    parts.append(item.strip())

        tables_field = data.get("tables")
        if isinstance(tables_field, list):
            for table_item in tables_field:
                if isinstance(table_item, str) and table_item.strip():
                    parts.append(table_item.strip())
                elif isinstance(table_item, (dict, list)):
                    parts.append(json.dumps(table_item))

        if parts:
            return "\n\n".join(parts)

        return json.dumps(data)

    if isinstance(data, list):
        parts: list[str] = []
        for item in data:
            if isinstance(item, str) and item.strip():
                parts.append(item.strip())
            elif isinstance(item, (dict, list)):
                parts.append(json.dumps(item))
            else:
                parts.append(str(item))
        return "\n\n".join(p for p in parts if p.strip())

    return str(data).strip()


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
# HYBRID GRAPH SEARCH ROUTE (Vector DB + Graph DB)
# ═══════════════════════════════════════════════════════════════════

@router.post("/query/hybrid-graph", response_model=HybridGraphSearchResponse)
async def query_hybrid_graph(request: HybridGraphSearchRequest):
    """Hybrid search fusing ChromaDB vector results with Neo4j graph results."""
    try:
        result = await hybrid_search(
            query=request.query,
            top_k=request.top_k,
            fusion=request.fusion,
            alpha=request.alpha,
        )

        return HybridGraphSearchResponse(
            results=result["results"],
            vector_count=len(result["vector_results"]),
            graph_count=len(result["graph_results"]),
        )
    except Exception as e:
        logger.error("Hybrid graph search failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Hybrid graph search failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# HYBRID SEARCH ROUTES (BM25 + Vector within ChromaDB)
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
# GRAPHRAG ROUTE
# ═══════════════════════════════════════════════════════════════════

@router.post("/query/graphrag", response_model=GraphRAGResponse)
async def query_graphrag(request: GraphRAGRequest):
    """GraphRAG: vector search enriched with Neo4j knowledge graph context."""
    try:
        result = await graphrag_query(request.query, request.top_k)

        sources = [
            SourceSnippet(
                text=c["text"],
                score=c["score"],
                submission_id=c["metadata"].get("submission_id"),
            )
            for c in result["chunks"]
        ]

        return GraphRAGResponse(
            answer=result["answer"],
            sources=sources,
            graph_sources=result["graph_context"],
        )
    except Exception as e:
        logger.error("GraphRAG query failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"GraphRAG query failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# GRAPH ROUTES (Neo4j)
# ═══════════════════════════════════════════════════════════════════

@router.post("/graph/query", response_model=GraphQueryResponse)
async def graph_query(request: GraphQueryRequest):
    """Execute a Cypher query against Neo4j."""
    try:
        results = await neo4j_client.run_query(request.cypher, request.params)
        return GraphQueryResponse(
            success=True,
            results=results,
            count=len(results),
        )
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Neo4j unavailable: {e}")
    except Exception as e:
        logger.error("Graph query failed", extra={"cypher": request.cypher, "error": str(e)})
        raise HTTPException(status_code=400, detail=f"Cypher query failed: {e}")


@router.get("/graph/stats")
async def graph_stats():
    """Get Neo4j graph node and relationship counts."""
    try:
        await neo4j_client.verify()
        stats = await neo4j_client.get_graph_stats()
        return {"neo4j_connected": True, **stats}
    except Exception:
        return {"neo4j_connected": False, "node_count": 0, "relationship_count": 0}


@router.get("/graph/nodes")
async def graph_nodes():
    """Get node counts grouped by label."""
    try:
        await neo4j_client.verify()
        counts = await neo4j_client.get_node_counts()
        return {"neo4j_connected": True, "labels": counts}
    except Exception:
        return {"neo4j_connected": False, "labels": []}


# ═══════════════════════════════════════════════════════════════════
# UTILITY ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.get("/health", response_model=HealthResponse)
async def health_check():
    neo4j_ok = False
    try:
        neo4j_ok = await neo4j_client.verify()
    except Exception:
        pass
    return HealthResponse(status="ok" if neo4j_ok else "degraded")


# ═══════════════════════════════════════════════════════════════════
# VLM OCR ROUTES
# ═══════════════════════════════════════════════════════════════════

@router.post("/vlm/extract", response_model=VLMExtractResponse)
async def vlm_extract(request: VLMExtractRequest, file: UploadFile = File(...)):
    """Extract structured data from image using VLM."""
    temp_file_path = ""
    try:
        suffix, detected_mime_type, _ = _validate_vlm_upload_file(file)
        temp_file_path = _save_upload_to_temp_file(file, suffix)

        vlm_service = VLMService(provider=request.provider)
        result = vlm_service.extract_structured(
            image_path=temp_file_path,
            schema=request.schema,
            mime_type=detected_mime_type,
        )

        if not result.get("success", False):
            raise HTTPException(
                status_code=502,
                detail=result.get("error") or "VLM extraction failed",
            )
        
        return VLMExtractResponse(
            success=result.get("success", False),
            provider=result.get("provider", request.provider),
            data=result.get("data"),
            error=result.get("error"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VLM extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"VLM extraction failed: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.post("/vlm/ocr/index", response_model=VLMOCRIndexResponse)
async def vlm_ocr_index(
    submission_id: int = Form(...),
    provider: str = Form(DEFAULT_VLM_PROVIDER),
    schema_json: str | None = Form(default=None),
    file: UploadFile = File(...),
):
    """Run OCR with VLM and index extracted text into vector DB for later querying."""
    temp_file_path = ""
    try:
        schema: dict | None = None
        normalized_schema_json = (schema_json or "").strip()
        # Swagger text fields sometimes submit placeholder values such as "string".
        if normalized_schema_json and normalized_schema_json.lower() not in {"string", "none", "null"}:
            try:
                parsed_schema = json.loads(normalized_schema_json)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"schema_json must be valid JSON object (example: {{\"text\": \"string\"}}): {e.msg}",
                ) from e
            if not isinstance(parsed_schema, dict):
                raise HTTPException(status_code=422, detail="schema_json must decode to a JSON object")
            schema = parsed_schema

        try:
            validated_request = VLMExtractFileRequest(
                provider=provider,
                schema=schema,
                submission_id=submission_id,
            )
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=e.errors()) from e

        if validated_request.submission_id is None:
            raise HTTPException(status_code=422, detail="submission_id is required")

        suffix, detected_mime_type, _ = _validate_vlm_upload_file(file)
        temp_file_path = _save_upload_to_temp_file(file, suffix)

        vlm_service = VLMService(provider=validated_request.provider)
        result = vlm_service.extract_structured(
            image_path=temp_file_path,
            schema=validated_request.schema,
            mime_type=detected_mime_type,
        )

        if not result.get("success", False):
            raise HTTPException(
                status_code=502,
                detail=result.get("error") or "OCR extraction failed",
            )

        extracted_text = _to_indexable_ocr_text(result.get("data"))
        if not extracted_text:
            raise HTTPException(status_code=422, detail="OCR completed but no indexable text was extracted")

        index_result = index_service.index_text(
            content=extracted_text,
            submission_id=validated_request.submission_id,
        )

        return VLMOCRIndexResponse(
            success=True,
            provider=result.get("provider", validated_request.provider),
            submission_id=validated_request.submission_id,
            chunks=index_result["chunk_count"],
            indexed_chars=len(extracted_text),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "VLM OCR indexing failed",
            extra={"submission_id": submission_id, "provider": provider, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"VLM OCR indexing failed: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.post("/vlm/compare", response_model=VLMCompareResponse)
async def vlm_compare(request: VLMCompareRequest, file: UploadFile = File(...)):
    """Compare VLM extraction across GPT-4o, Claude, and Gemini 3 Flash."""
    temp_file_path = ""
    try:
        suffix, detected_mime_type, _ = _validate_vlm_upload_file(file)
        temp_file_path = _save_upload_to_temp_file(file, suffix)

        vlm_service = VLMService()
        results = vlm_service.compare_all(
            image_path=temp_file_path,
            schema=request.schema,
            mime_type=detected_mime_type,
        )
        
        return VLMCompareResponse(
            results=[
                VLMExtractResponse(
                    success=r.get("success", False),
                    provider=r.get("provider", "unknown"),
                    data=r.get("data"),
                    error=r.get("error"),
                )
                for r in results
            ]
        )
    except Exception as e:
        logger.error(f"VLM comparison failed: {e}")
        raise HTTPException(status_code=500, detail=f"VLM comparison failed: {e}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
