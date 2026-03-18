import httpx
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LLMService:
    def __init__(self):
        self.provider = settings.llm_provider
        self.ollama_base_url = settings.ollama_base_url
        self.ollama_model = settings.llm_model

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        if self.provider == "ollama":
            return self._ollama_generate(prompt, system_prompt)
        elif self.provider == "openai":
            return self._openai_generate(prompt, system_prompt)
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")

    def _ollama_generate(self, prompt: str, system_prompt: str = "") -> str:
        url = f"{self.ollama_base_url}/api/generate"
        
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        payload = {
            "model": self.ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            }
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("response", "").strip()
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise

    def _openai_generate(self, prompt: str, system_prompt: str = "") -> str:
        raise NotImplementedError("OpenAI integration not yet implemented")


llm_service = LLMService()