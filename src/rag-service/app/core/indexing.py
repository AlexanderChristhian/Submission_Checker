from llama_index.core.node_parser import SentenceSplitter

from app.config import settings
from app.utils.logger import get_logger
from app.utils.text_processing import clean_text

logger = get_logger(__name__)

def chunk_document(content: str, submission_id: int) -> list[dict]:
    """Split a document into chunks with metadata.
    # 
    Returns a list of dicts with 'text', 'metadata' keys ready for embedding/storage.
    """
    cleaned = clean_text(content)
    
    splitter = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_text(cleaned)

    result = []
    for i, chunk in enumerate(chunks):
        result.append(
            {
                "text": chunk,
                "metadata": {
                    "submission_id": submission_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            }
        )

    logger.info(
        "Chunked document into %d pieces",
        len(result),
        extra={"submission_id": submission_id},
    )
    return result
