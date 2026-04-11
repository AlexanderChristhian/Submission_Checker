"""Custom LlamaIndex LLM class that wraps the existing Ollama LLM service."""

from typing import Any, List, Optional
from llama_index.core.llms import CustomLLM, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback
from pydantic import Field, PrivateAttr

from app.core.llm import llm_service
from app.config import settings as app_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OllamaLLM(CustomLLM):
    """Custom LlamaIndex LLM class for Ollama.
    
    This wraps the existing LLMService (Ollama) to be compatible
    with LlamaIndex's LLM interface.
    """
    
    model_name: str = Field(default="llama3.1:8b", description="Ollama model name")
    base_url: str = Field(default="http://localhost:11434", description="Ollama base URL")
    
    _llm_service: Any = PrivateAttr()
    
    def __init__(self, **data: Any):
        super().__init__(**data)
        self._llm_service = llm_service
        logger.info(f"OllamaLLM initialized with model: {self.model_name}")
    
    @property
    def metadata(self) -> LLMMetadata:
        """Get LLM metadata."""
        return LLMMetadata(
            model_name=self.model_name,
            context_window=4096,  # Default for llama3.1
            num_output=512,
            is_chat_model=False,
        )
    
    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs: Any) -> str:
        """Complete a prompt."""
        try:
            return self._llm_service.generate(prompt)
        except Exception as e:
            logger.error(f"Ollama LLM completion failed: {e}")
            raise
    
    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs: Any):
        """Stream complete a prompt (not implemented)."""
        # For now, just return the complete response
        response = self.complete(prompt, **kwargs)
        yield response

    async def acomplete(self, prompt: str, **kwargs: Any) -> str:
        """Async complete a prompt."""
        return self.complete(prompt, **kwargs)

    async def astream_complete(self, prompt: str, **kwargs: Any):
        """Async stream complete a prompt."""
        response = await self.acomplete(prompt, **kwargs)
        yield response