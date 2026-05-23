from pydantic import BaseModel, Field, field_validator
from app.core.vlm_constants import (
    DEFAULT_VLM_PROVIDER,
    SUPPORTED_VLM_PROVIDERS,
    VLM_PROVIDER_ALIASES,
)


# ── Request Models ─────────────────────────────────────────

class IndexTextRequest(BaseModel):
    submission_id: int = Field(..., gt=0, description="Unique submission identifier")
    content: str = Field(..., min_length=1, max_length=500000, description="Text content to index")


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000, description="Search query string")
    top_k: int = Field(default=5, ge=1, le=100, description="Number of results to return")


class SimilarityRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Text to find similar submissions")
    top_k: int = Field(default=10, ge=1, le=100, description="Number of matches to return")


class QueryFileRequest(BaseModel):
    top_k: int = Field(default=5, ge=1, le=100)


class SimilarFileRequest(BaseModel):
    top_k: int = Field(default=10, ge=1, le=100)


class DeleteRequest(BaseModel):
    submission_id: int = Field(..., gt=0, description="Submission ID to delete")


# ── Response Models ────────────────────────────────────────

class IndexResponse(BaseModel):
    status: str
    chunks: int


class SourceSnippet(BaseModel):
    text: str
    score: float
    submission_id: int | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]


class SimilarityMatch(BaseModel):
    submission_id: int
    score: float
    title: str
    matched_text: str | None = None


class SimilarityResponse(BaseModel):
    matches: list[SimilarityMatch]


class FileQueryResponse(BaseModel):
    status: str
    answer: str | None = None
    sources: list[SourceSnippet]


class FileSimilarResponse(BaseModel):
    status: str
    matches: list[SimilarityMatch]


class GraphQueryRequest(BaseModel):
    cypher: str = Field(..., min_length=1, max_length=10000, description="Cypher query string")
    params: dict = Field(default_factory=dict, description="Query parameters")


class GraphQueryResponse(BaseModel):
    success: bool
    results: list[dict]
    count: int


class HealthResponse(BaseModel):
    status: str


class HybridQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000)
    top_k: int = Field(default=5, ge=1, le=100)
    num_queries: int = Field(default=1, ge=1, le=10)
    fusion_mode: str = Field(default="reciprocal_rerank")

    @field_validator("fusion_mode")
    @classmethod
    def validate_fusion_mode(cls, v: str) -> str:
        valid_modes = ["reciprocal_rerank", "simple_sum", "dist_based_score"]
        if v not in valid_modes:
            raise ValueError(f"fusion_mode must be one of {valid_modes}")
        return v


class MultiStepQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000)
    top_k: int = Field(default=5, ge=1, le=100)
    use_hybrid: bool = Field(default=False)
    enable_decomposition: bool = Field(default=False)
    synthesis_mode: str = Field(default="compact")
    num_queries: int = Field(default=1, ge=1, le=10)
    fusion_mode: str = Field(default="reciprocal_rerank")

    @field_validator("synthesis_mode")
    @classmethod
    def validate_synthesis_mode(cls, v: str) -> str:
        valid_modes = ["compact", "refine", "tree_summarize", "accumulate"]
        if v not in valid_modes:
            raise ValueError(f"synthesis_mode must be one of {valid_modes}")
        return v

    @field_validator("fusion_mode")
    @classmethod
    def validate_fusion_mode(cls, v: str) -> str:
        valid_modes = ["reciprocal_rerank", "simple_sum", "dist_based_score"]
        if v not in valid_modes:
            raise ValueError(f"fusion_mode must be one of {valid_modes}")
        return v


class MultiStepQueryResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]
    sub_queries: list[str] | None = None
    transform_type: str | None = None


# ── GraphRAG Schemas ───────────────────────────────────────

class GraphRAGRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000, description="Search query string")
    top_k: int = Field(default=5, ge=1, le=100, description="Number of vector results to retrieve")


class GraphRelation(BaseModel):
    submissionId: int | None = None
    score: float | None = None


class GraphNode(BaseModel):
    title: str | None = None
    status: str | None = None
    similar: list[GraphRelation] = []
    author: str | None = None
    assignment: str | None = None


class GraphRAGResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]
    graph_sources: list[GraphNode]


# ── Hybrid Graph Search Schemas ────────────────────────────

class HybridGraphSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000, description="Search query string")
    top_k: int = Field(default=10, ge=1, le=100, description="Number of fused results")
    fusion: str = Field(default="rrf", description="Fusion method: rrf or weighted")
    alpha: float | None = Field(default=None, ge=0.0, le=1.0, description="Vector weight for weighted fusion")


class HybridSearchItem(BaseModel):
    id: str
    fusion_score: float
    vector_score: float | None = None
    graph_score: float | None = None
    text: str | None = None
    title: str | None = None
    source: str = "unknown"


class HybridGraphSearchResponse(BaseModel):
    results: list[HybridSearchItem]
    vector_count: int
    graph_count: int


# ── VLM OCR Schemas ────────────────────────────────────────

VLM_PROVIDER_DESCRIPTION = f"VLM provider: {', '.join(SUPPORTED_VLM_PROVIDERS)}"

class VLMExtractRequest(BaseModel):
    provider: str = Field(default=DEFAULT_VLM_PROVIDER, description=VLM_PROVIDER_DESCRIPTION)
    schema: dict | None = Field(default=None, description="JSON schema for extraction")

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        normalized = VLM_PROVIDER_ALIASES.get(v, v)
        if normalized not in SUPPORTED_VLM_PROVIDERS:
            valid_providers = list(SUPPORTED_VLM_PROVIDERS) + list(VLM_PROVIDER_ALIASES.keys())
            raise ValueError(f"provider must be one of {valid_providers}")
        return normalized


class VLMExtractFileRequest(BaseModel):
    provider: str = Field(default=DEFAULT_VLM_PROVIDER, description=VLM_PROVIDER_DESCRIPTION)
    schema: dict | None = None
    submission_id: int | None = Field(default=None, gt=0)

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        normalized = VLM_PROVIDER_ALIASES.get(v, v)
        if normalized not in SUPPORTED_VLM_PROVIDERS:
            valid_providers = list(SUPPORTED_VLM_PROVIDERS) + list(VLM_PROVIDER_ALIASES.keys())
            raise ValueError(f"provider must be one of {valid_providers}")
        return normalized


class VLMCompareRequest(BaseModel):
    schema: dict | None = None


class VLMExtractResponse(BaseModel):
    success: bool
    provider: str
    data: dict | None = None
    error: str | None = None


class VLMCompareResponse(BaseModel):
    results: list[VLMExtractResponse]


class VLMOCRIndexResponse(BaseModel):
    success: bool
    provider: str
    submission_id: int
    chunks: int = 0
    indexed_chars: int = 0
    error: str | None = None
