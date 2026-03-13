import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore

from app.stores.chroma_store import get_collection
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_vector_store(collection: chromadb.Collection | None = None) -> ChromaVectorStore:
    """Create a LlamaIndex-compatible ChromaVectorStore."""
    col = collection or get_collection()
    return ChromaVectorStore(chroma_collection=col)


def get_index(collection: chromadb.Collection | None = None) -> VectorStoreIndex:
    """Build a LlamaIndex VectorStoreIndex backed by ChromaDB."""
    vector_store = get_vector_store(collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        storage_context=storage_context,
    )
