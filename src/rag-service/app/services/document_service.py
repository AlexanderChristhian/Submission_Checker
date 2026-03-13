from app.utils.text_processing import clean_text
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DocumentService:
    """Handles document loading, cleaning, and preprocessing."""

    def process(self, content: str, submission_id: int) -> str:
        """Clean and validate document content before indexing."""
        cleaned = clean_text(content)

        if not cleaned:
            raise ValueError(f"Empty content for submission {submission_id}")

        logger.info(
            "Processed document: %d chars -> %d chars",
            len(content),
            len(cleaned),
            extra={"submission_id": submission_id},
        )
        return cleaned
