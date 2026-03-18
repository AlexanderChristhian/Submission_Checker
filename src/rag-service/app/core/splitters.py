from llama_index.core import Document
from llama_index.core.node_parser import (
    SentenceSplitter,
    MarkdownNodeParser,
    CodeSplitter,
    NodeParser
)

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class DocumentSplitterStrategy:
    """Provides the appropriate LlamaIndex NodeParser or TextSplitter based on document type."""

    @staticmethod
    def get_splitter(file_ext: str = "") -> NodeParser | SentenceSplitter:
        """
        Return the suitable NodeParser/TextSplitter based on file extension.
        Defaults to SentenceSplitter.
        """
        ext = file_ext.lower().strip()

        if ext in [".md", ".markdown"]:
            logger.info("Using MarkdownNodeParser for %s", ext)
            return MarkdownNodeParser()

        elif ext in [".js", ".ts", ".py", ".html", ".css", ".java", ".cpp", ".c", ".cs"]:
            logger.info("Using CodeSplitter for %s", ext)
            language = ext.lstrip(".") # Remove dot
            # Basic mapping as code splitter requires language string
            lang_map = {
                "js": "javascript",
                "ts": "typescript",
                "py": "python",
                "html": "html",
                "css": "css",
            }
            mapped_lang = lang_map.get(language, language)
            try:
                return CodeSplitter(
                    language=mapped_lang,
                    chunk_lines=50,
                    chunk_lines_overlap=10,
                    max_chars=settings.chunk_size,
                )
            except Exception as e:
                logger.warning("CodeSplitter failed to init for %s, falling back to SentenceSplitter: %s", ext, e)

        # Default Splitter Strategy: SentenceSplitter
        logger.info("Using SentenceSplitter as default for %s", ext)
        return SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

def smarter_chunk_llama_documents(documents: list[Document], submission_id: int) -> list[dict]:
    """Smartly split documents based on their underlying file types."""
    result = []
    
    for doc in documents:
        # Get source file extension from metadata
        source_file = doc.metadata.get("source_file", "")
        import os
        ext = os.path.splitext(source_file)[1] if source_file else ""
        
        splitter = DocumentSplitterStrategy.get_splitter(ext)
        
        # Get nodes from document
        nodes = splitter.get_nodes_from_documents([doc])
        
        # Optionally, if a specialized parser (like Markdown) yields massive nodes,
        # we could further subdivide here using a SentenceSplitter map.
        # But this suffices for an initial smart strategy.

        for node in nodes:
            metadata = node.metadata.copy()
            metadata.update({
                "submission_id": submission_id,
            })
            result.append({
                "text": node.get_content(),
                "metadata": metadata,
            })

    # Add chunk index and total chunks to metadata
    total_chunks = len(result)
    for i, chunk in enumerate(result):
        chunk["metadata"]["chunk_index"] = i
        chunk["metadata"]["total_chunks"] = total_chunks
        
    logger.info(
        "Smart chunked %d documents into %d pieces",
        len(documents),
        len(result),
        extra={"submission_id": submission_id},
    )
    return result
