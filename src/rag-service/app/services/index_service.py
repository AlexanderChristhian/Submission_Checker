from llama_index.core import Document

from app.core.indexing import chunk_document, chunk_llama_documents
from app.core.embeddings import generate_embeddings
from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IndexService:
    """Service for indexing documents into vector store."""

    def index_file(self, documents: list[Document], submission_id: int) -> dict:
        chunks = chunk_llama_documents(documents, submission_id)
        return self._embed_and_store(chunks, submission_id)

    def index_text(self, content: str, submission_id: int) -> dict:
        chunks = chunk_document(content, submission_id)
        return self._embed_and_store(chunks, submission_id)

    def _embed_and_store(self, chunks: list[dict], submission_id: int) -> dict:
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

        return {"chunk_count": len(chunks), "submission_id": submission_id}

    def delete_submission(self, submission_id: int) -> None:
        collection = get_collection()
        collection.delete(where={"submission_id": submission_id})
        logger.info("Deleted chunks for submission %d", submission_id, extra={"submission_id": submission_id})


index_service = IndexService()