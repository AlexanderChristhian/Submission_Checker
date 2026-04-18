import base64
import json
import mimetypes
import re
from abc import ABC, abstractmethod
from typing import Any
from app.config import settings
from app.core.vlm_constants import (
    DEFAULT_VLM_PROVIDER,
    SUPPORTED_VLM_PROVIDERS,
    VLM_PROVIDER_ALIASES,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
}

_DATA_URL_PATTERN = re.compile(
    r"^data:(?P<mime>[\w.+-]+/[\w.+-]+);base64,(?P<data>.+)$",
    flags=re.IGNORECASE | re.DOTALL,
)


def _normalize_image_mime_type(mime_type: str | None) -> str:
    normalized = (mime_type or "image/jpeg").strip().lower()
    if normalized == "image/jpg":
        normalized = "image/jpeg"
    if normalized not in SUPPORTED_IMAGE_MIME_TYPES:
        raise ValueError(
            f"Unsupported image MIME type: {mime_type}. Allowed: {sorted(SUPPORTED_IMAGE_MIME_TYPES)}"
        )
    return normalized


def _split_data_url(image_base64: str) -> tuple[str, str | None]:
    payload = image_base64.strip()
    data_url_match = _DATA_URL_PATTERN.match(payload)
    if not data_url_match:
        return payload, None

    return data_url_match.group("data"), data_url_match.group("mime")


def _guess_mime_type_from_path(image_path: str, fallback_mime_type: str | None = None) -> str:
    guessed_mime_type, _ = mimetypes.guess_type(image_path)
    return _normalize_image_mime_type(guessed_mime_type or fallback_mime_type)


class VLMBase(ABC):
    @abstractmethod
    def extract_from_image(
        self,
        image_path: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        pass

    @abstractmethod
    def extract_from_base64(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        pass


class GPT4VService(VLMBase):
    provider_name = "gpt-4o"

    def __init__(self, api_key: str | None = None):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)

    def extract_from_image(
        self,
        image_path: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        resolved_mime_type = _guess_mime_type_from_path(image_path, mime_type)
        return self.extract_from_base64(image_data, prompt, mime_type=resolved_mime_type)

    def extract_from_base64(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        try:
            image_payload, embedded_mime_type = _split_data_url(image_base64)
            resolved_mime_type = _normalize_image_mime_type(mime_type or embedded_mime_type)

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{resolved_mime_type};base64,{image_payload}",
                                    "detail": "high"
                                },
                            },
                        ],
                    }
                ],
                max_tokens=4096,
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return {"success": True, "data": json.loads(content), "provider": "gpt-4o"}
        except Exception as e:
            logger.exception("GPT-4V extraction failed")
            return {"success": False, "error": str(e), "provider": "gpt-4o"}


class ClaudeVisionService(VLMBase):
    provider_name = "claude-3-5-sonnet"

    def __init__(self, api_key: str | None = None):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)

    def extract_from_image(
        self,
        image_path: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        resolved_mime_type = _guess_mime_type_from_path(image_path, mime_type)
        return self.extract_from_base64(image_data, prompt, mime_type=resolved_mime_type)

    def extract_from_base64(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        try:
            image_payload, embedded_mime_type = _split_data_url(image_base64)
            resolved_mime_type = _normalize_image_mime_type(mime_type or embedded_mime_type)

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": resolved_mime_type,
                                    "data": image_payload,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            )
            content = response.content[0].text
            return {"success": True, "data": json.loads(content), "provider": "claude-3-5-sonnet"}
        except Exception as e:
            logger.exception("Claude Vision extraction failed")
            return {"success": False, "error": str(e), "provider": "claude-3-5-sonnet"}


class GeminiVisionService(VLMBase):
    provider_name = "gemini-3-flash"
    model_name = "gemini-3-flash"
    fallback_model_names = (
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
    )

    def __init__(self, api_key: str | None = None):
        import google.genai as genai
        self.client = genai.Client(api_key=api_key)
        configured_model = self.model_name
        self.model_candidates = tuple(dict.fromkeys([configured_model, *self.fallback_model_names]))

    @staticmethod
    def _is_model_not_found_error(error: Exception) -> bool:
        error_text = str(error).lower()
        return "not_found" in error_text or "is not found" in error_text or "404" in error_text

    def _generate_content_with_fallback(self, contents: list[Any]) -> tuple[Any, str]:
        last_error: Exception | None = None
        for candidate_model in self.model_candidates:
            try:
                response = self.client.models.generate_content(
                    model=candidate_model,
                    contents=contents,
                )
                if candidate_model != self.model_name:
                    logger.warning(
                        "Gemini model fallback used. Requested %s, active %s",
                        self.model_name,
                        candidate_model,
                    )
                return response, candidate_model
            except Exception as e:
                last_error = e
                if self._is_model_not_found_error(e):
                    logger.warning(
                        "Gemini model unavailable: %s. Trying next fallback.",
                        candidate_model,
                    )
                    continue
                raise

        raise RuntimeError(
            f"No compatible Gemini model available. Tried {list(self.model_candidates)}. Last error: {last_error}"
        )

    @staticmethod
    def _try_parse_json(raw_text: str) -> Any | None:
        try:
            return json.loads(raw_text)
        except Exception:
            return None

    def _parse_response_payload(self, response: Any, used_model: str) -> Any:
        raw_text = (getattr(response, "text", None) or "").strip()

        if raw_text:
            parsed = self._try_parse_json(raw_text)
            if parsed is not None:
                return parsed

            fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text, flags=re.IGNORECASE)
            if fenced_match:
                parsed = self._try_parse_json(fenced_match.group(1).strip())
                if parsed is not None:
                    return parsed

            json_obj_match = re.search(r"\{[\s\S]*\}", raw_text)
            if json_obj_match:
                parsed = self._try_parse_json(json_obj_match.group(0).strip())
                if parsed is not None:
                    return parsed

            logger.warning("Gemini returned non-JSON content; using raw text fallback for OCR indexing.")
            return {
                "text": raw_text,
                "tables": [],
                "metadata": {
                    "document_type": "unknown",
                    "provider_model": used_model,
                    "parse_warning": "non_json_response",
                },
            }

        raise ValueError("Gemini returned an empty response")

    def extract_from_image(
        self,
        image_path: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        try:
            from PIL import Image
            image = Image.open(image_path)
            response, used_model = self._generate_content_with_fallback([prompt, image])
            logger.info("Gemini extraction succeeded with model: %s", used_model)
            parsed_data = self._parse_response_payload(response, used_model)
            return {"success": True, "data": parsed_data, "provider": self.provider_name}
        except Exception as e:
            logger.error(f"Gemini Vision extraction failed: {e}")
            return {"success": False, "error": str(e), "provider": self.provider_name}

    def extract_from_base64(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        try:
            import io
            from PIL import Image
            image_payload, _ = _split_data_url(image_base64)
            image = Image.open(io.BytesIO(base64.b64decode(image_payload)))
            response, used_model = self._generate_content_with_fallback([prompt, image])
            logger.info("Gemini extraction succeeded with model: %s", used_model)
            parsed_data = self._parse_response_payload(response, used_model)
            return {"success": True, "data": parsed_data, "provider": self.provider_name}
        except Exception as e:
            logger.error(f"Gemini Vision extraction failed: {e}")
            return {"success": False, "error": str(e), "provider": self.provider_name}


class VLMService:
    PROVIDERS = {
        "gpt-4o": GPT4VService,
        "claude-3-5-sonnet": ClaudeVisionService,
        "gemini-3-flash": GeminiVisionService,
    }

    @staticmethod
    def _resolve_api_key(provider: str, api_key: str | None = None) -> str | None:
        if api_key:
            return api_key
        if provider == "gpt-4o":
            return settings.openai_api_key
        if provider == "claude-3-5-sonnet":
            return settings.anthropic_api_key
        if provider == "gemini-3-flash":
            return settings.gemini_api_key
        return None

    def __init__(self, provider: str = DEFAULT_VLM_PROVIDER, api_key: str | None = None):
        canonical_provider = VLM_PROVIDER_ALIASES.get(provider, provider)
        if canonical_provider not in self.PROVIDERS:
            accepted = list(self.PROVIDERS.keys()) + list(VLM_PROVIDER_ALIASES.keys())
            raise ValueError(f"Unknown provider: {provider}. Available: {accepted}")
        resolved_api_key = self._resolve_api_key(canonical_provider, api_key)
        self.service = self.PROVIDERS[canonical_provider](resolved_api_key)
        self.provider = canonical_provider
        logger.info(f"VLMService initialized with provider: {canonical_provider}")

    def extract_structured(
        self,
        image_path: str | None = None,
        image_base64: str | None = None,
        schema: dict[str, Any] | None = None,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        prompt = self._build_prompt(schema)
        
        if image_path:
            return self.service.extract_from_image(image_path, prompt, mime_type=mime_type)
        elif image_base64:
            return self.service.extract_from_base64(image_base64, prompt, mime_type=mime_type)
        else:
            return {"success": False, "error": "No image provided", "provider": self.provider}

    def _build_prompt(self, schema: dict[str, Any] | None = None) -> str:
        if schema:
            schema_str = json.dumps(schema, indent=2)
            return f"""You are a document extraction assistant. Analyze the provided image and extract structured data.
            
Output ONLY valid JSON matching this schema:
{schema_str}

Respond with only the JSON object, no additional text."""
        return """You are a document extraction assistant. Analyze the provided image and extract all text content.
        
Output the extracted text as JSON with the following structure:
{{
    "text": "extracted text content",
    "tables": ["table data if any"],
    "metadata": {{"document_type": "type if identifiable"}}
}}

Respond with only the JSON object, no additional text."""

    def compare_all(
        self,
        image_path: str | None = None,
        image_base64: str | None = None,
        schema: dict[str, Any] | None = None,
        mime_type: str | None = None,
    ) -> list[dict[str, Any]]:
        results = []
        for provider_name in self.PROVIDERS.keys():
            try:
                provider_api_key = self._resolve_api_key(provider_name)
                service = self.PROVIDERS[provider_name](provider_api_key)
                prompt = self._build_prompt(schema)
                
                if image_path:
                    result = service.extract_from_image(image_path, prompt, mime_type=mime_type)
                elif image_base64:
                    result = service.extract_from_base64(image_base64, prompt, mime_type=mime_type)
                else:
                    continue
                    
                results.append(result)
            except Exception as e:
                logger.warning(f"Provider {provider_name} failed: {e}")
                results.append({"success": False, "error": str(e), "provider": provider_name})
        return results