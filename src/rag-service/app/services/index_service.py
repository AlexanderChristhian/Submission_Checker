from dataclasses import dataclass

from app.core.indexing import chunk_document, chunk_llama_documents
from app.core.embeddings import generate_embeddings
from app.services.document_service import DocumentService
from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class IndexResult:
    chunk_count: int
    submission_id: int


class IndexService:
    """Manages the indexing pipeline: chunk -> embed -> store in ChromaDB.""" 

    def __init__(self):
        self.doc_service = DocumentService()

    def index_file(self, submission_id: int, file_path: str) -> IndexResult:
        """Load from a file structure directly to ChromaDB."""
        docs = self.doc_service.load_document(file_path, submission_id)
        chunks = chunk_llama_documents(docs, submission_id)
        return self._embed_and_store(submission_id, chunks)

    def index_text(self, submission_id: int, content: str) -> IndexResult:
        """Chunk a raw string document, embed it, and store in ChromaDB."""
        chunks = chunk_document(content, submission_id)
        return self._embed_and_store(submission_id, chunks)

    def _embed_and_store(self, submission_id: int, chunks: list[dict]) -> IndexResult:
        if not chunks:
            raise ValueError(f"No chunks produced for submission {submission_id}")

        texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(texts)

        collection = get_collection()
        ids = [f"sub-{submission_id}-chunk-{i}" for i in range(len(chunks))]
        metadatas = [c["metadata"] for c in chunks]

        collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        logger.info(
            "Indexed %d chunks for submission %d",
            len(chunks),
            submission_id,
            extra={"submission_id": submission_id},
        )

        return IndexResult(chunk_count=len(chunks), submission_id=submission_id)

    def delete(self, submission_id: int) -> None:
        """Remove all chunks for a submission from ChromaDB."""
        collection = get_collection()
        # Delete by metadata filter
        collection.delete(where={"submission_id": submission_id})

        logger.info(
            "Deleted chunks for submission %d",
            submission_id,
            extra={"submission_id": submission_id},
        )

