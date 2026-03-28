from pydantic import BaseModel, Field, field_validator


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
