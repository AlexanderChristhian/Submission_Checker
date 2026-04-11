"""Configure LlamaIndex global settings to use local models."""

from llama_index.core import Settings
from app.core.llama_embeddings import BGEM3Embedding
from app.core.llama_llm import OllamaLLM
from app.config import settings as app_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def configure_llama_index():
    """Set LlamaIndex global settings to use local models.
    
    This should be called once at application startup.
    """
    logger.info("Configuring LlamaIndex global settings...")
    
    # Set embedding model to our custom BGE-M3 embedding
    # This ensures consistency with the existing FlagEmbedding model
    embed_model = BGEM3Embedding(
        model_name=app_settings.bge_m3_model,
        use_fp16=app_settings.bge_m3_use_fp16,
    )
    Settings.embed_model = embed_model
    logger.info(f"Set LlamaIndex embedding model: {app_settings.bge_m3_model}")
    
    # Set LLM to our custom Ollama LLM
    # This is needed for QueryFusionRetriever when num_queries > 1
    llm = OllamaLLM(
        model_name=app_settings.llm_model,
        base_url=app_settings.ollama_base_url,
    )
    Settings.llm = llm
    logger.info(f"Set LlamaIndex LLM: {app_settings.llm_model} at {app_settings.ollama_base_url}")
    
    logger.info("LlamaIndex configuration complete")