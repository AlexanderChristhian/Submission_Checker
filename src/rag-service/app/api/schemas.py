from pydantic import BaseModel


# ── Request Models ─────────────────────────────────────────

class IndexTextRequest(BaseModel):
    submission_id: int
    content: str


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5


class SimilarityRequest(BaseModel):
    text: str
    top_k: int = 10


class QueryFileRequest(BaseModel):
    top_k: int = 5


class SimilarFileRequest(BaseModel):
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
