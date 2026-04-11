import os
from pathlib import Path
from typing import List

from app.utils.text_processing import clean_text
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DocumentService:
    """Handles document loading, cleaning, and preprocessing."""

    def load_document(self, file_path: str, submission_id: int, extra_metadata: dict = None) -> List:
        """
        Load a document (PDF or Markdown) and return a list of standard LlamaIndex Documents.
        Automatically attaches relevant metadata like submission_id.
        """
        # Import LlamaIndex modules inside function to avoid top-level imports
        from llama_index.core import Document, SimpleDirectoryReader
        try:
            from llama_index.readers.file import PDFReader
        except ImportError:
            PDFReader = None
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        documents = []

        metadata = {
            "submission_id": submission_id,
            "source_file": os.path.basename(file_path)
        }
        if extra_metadata:
            metadata.update(extra_metadata)

        if ext == ".pdf":
            if PDFReader is None:
                # Fallback to SimpleDirectoryReader if specific PDFReader isn't available
                reader = SimpleDirectoryReader(input_files=[file_path])
                docs = reader.load_data()
            else:
                reader = PDFReader()
                docs = reader.load_data(file=Path(file_path))
            documents.extend(docs)

        elif ext in [".md", ".markdown", ".txt"]:
            # Standard reader for markdown and text
            reader = SimpleDirectoryReader(
                input_files=[file_path],
                # If you want to extract headings or similar, would go here
            )
            docs = reader.load_data()
            documents.extend(docs)
        else:
            raise ValueError(f"Unsupported file extension for {file_path}: {ext}")

        new_documents = []
        for doc in documents:
            cleaned_text = clean_text(doc.text)
            new_doc = Document(text=cleaned_text, metadata={**doc.metadata, **metadata})
            new_doc.excluded_embed_metadata_keys.extend(["source_file"])
            new_documents.append(new_doc)
        
        logger.info(
            "Loaded %d pages/sections from %s",
            len(new_documents),
            file_path,
            extra={"submission_id": submission_id}
        )
        return new_documents

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
