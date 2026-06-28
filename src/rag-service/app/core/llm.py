import json
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

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        if self.provider == "ollama":
            return self._ollama_generate_json(prompt, system_prompt)
        raise ValueError(f"JSON mode not supported for provider: {self.provider}")

    def _ollama_generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        url = f"{self.ollama_base_url}/api/generate"

        max_len = 60_000
        if len(prompt) > max_len:
            prompt = prompt[:max_len] + "\n\n[Content truncated due to length]"

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        payload = {
            "model": self.ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            }
        }

        try:
            with httpx.Client(timeout=180.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                self._log_usage(result)
                raw = result.get("response", "").strip()
                return json.loads(raw)
        except Exception as e:
            logger.error(f"Ollama JSON generation failed: {e}")
            raise

    def _ollama_generate(self, prompt: str, system_prompt: str = "") -> str:
        url = f"{self.ollama_base_url}/api/generate"
        
        max_len = 60_000
        if len(prompt) > max_len:
            prompt = prompt[:max_len] + "\n\n[Content truncated due to length]"
        
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
            with httpx.Client(timeout=180.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                self._log_usage(result)
                return result.get("response", "").strip()
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise

    def _log_usage(self, result: dict) -> None:
        logger.info(
            "Ollama token usage",
            extra={
                "model": self.ollama_model,
                "prompt_tokens": result.get("prompt_eval_count"),
                "eval_tokens": result.get("eval_count"),
                "prompt_duration_ms": round(result.get("prompt_eval_duration", 0) / 1_000_000, 1) if result.get("prompt_eval_duration") else None,
                "eval_duration_ms": round(result.get("eval_duration", 0) / 1_000_000, 1) if result.get("eval_duration") else None,
                "total_duration_ms": round(result.get("total_duration", 0) / 1_000_000, 1) if result.get("total_duration") else None,
            },
        )

    def _openai_generate(self, prompt: str, system_prompt: str = "") -> str:
        raise NotImplementedError("OpenAI integration not yet implemented")


llm_service = LLMService()