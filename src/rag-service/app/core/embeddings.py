from functools import lru_cache

from FlagEmbedding import BGEM3FlagModel

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_embedding_model() -> BGEM3FlagModel:
    """Load BGE-M3 once and cache in memory."""
    logger.info("Loading BGE-M3 model: %s", settings.bge_m3_model)
    return BGEM3FlagModel(settings.bge_m3_model, use_fp16=settings.bge_m3_use_fp16)


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate dense embeddings for a list of texts using BGE-M3."""
    model = get_embedding_model()
    output = model.encode(texts)
    # BGE-M3 encode() returns dict with 'dense_vecs' key
    return output["dense_vecs"].tolist()


def generate_embedding(text: str) -> list[float]:
    """Generate a single dense embedding."""
    return generate_embeddings([text])[0]
