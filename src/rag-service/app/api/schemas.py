from pydantic import BaseModel


# ── Request Models ─────────────────────────────────────────


class IndexTextRequest(BaseModel):
    submission_id: int
    content: str


class QueryRequest(BaseModel):
    submission_id: int
    query: str


class SimilarityRequest(BaseModel):
    submission_id: int
    top_k: int = 10


class DeleteRequest(BaseModel):
    submission_id: int


# ── Response Models ────────────────────────────────────────


class IndexResponse(BaseModel):
    status: str
    chunks: int


class SourceSnippet(BaseModel):
    text: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]


class SimilarityMatch(BaseModel):
    submission_id: int
    score: float
    title: str


class SimilarityResponse(BaseModel):
    matches: list[SimilarityMatch]


class HealthResponse(BaseModel):
    status: str
