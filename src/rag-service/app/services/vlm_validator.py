import re
import json
from typing import Any
from datetime import datetime
from app.utils.logger import get_logger

logger = get_logger(__name__)

QUALITY_ALPHA_LOW_THRESHOLD = 0.3
QUALITY_ALPHA_MEDIUM_THRESHOLD = 0.2
QUALITY_NOISE_CHAR_THRESHOLD = 0.1
QUALITY_MIN_LENGTH_RATIO = 0.01
QUALITY_MAX_LENGTH_RATIO = 0.5

DATE_PATTERNS = [
    (re.compile(r"\d{4}-\d{2}-\d{2}"), "%Y-%m-%d"),
    (re.compile(r"\d{2}/\d{2}/\d{4}"), "%m/%d/%Y"),
    (re.compile(r"\d{2}-\d{2}-\d{4}"), "%m-%d-%Y"),
    (re.compile(r"\d{4}/\d{2}/\d{2}"), "%Y/%m/%d"),
]

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

PHONE_PATTERN = re.compile(r"^\+?[\d\s\-\(\)]{7,20}$")


def parse_date(value: str) -> str | None:
    cleaned = value.strip().strip(".,")
    for pattern, fmt in DATE_PATTERNS:
        if pattern.match(cleaned):
            try:
                return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue

    try:
        parsed = datetime.fromisoformat(cleaned)
        return parsed.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        pass

    return None


def validate_field_type(value: Any, expected_type: str, field_name: str) -> tuple[Any, float]:
    if value is None:
        return None, 0.0

    type_map = {
        "string": str,
        "number": (int, float),
        "integer": int,
        "boolean": bool,
        "array": list,
        "object": dict,
    }

    target = type_map.get(expected_type)
    if target is None:
        return value, 0.5

    if isinstance(value, target):
        return value, 1.0

    if expected_type == "number" and isinstance(value, (int, float)):
        return float(value), 1.0

    if expected_type == "integer" and isinstance(value, float):
        if value == int(value):
            return int(value), 0.9
        logger.warning("field type mismatch", extra={"field": field_name, "expected": expected_type, "got": type(value).__name__})
        return int(value), 0.5

    if expected_type == "string" and not isinstance(value, str):
        return str(value), 0.7

    logger.warning("field type mismatch", extra={"field": field_name, "expected": expected_type, "got": type(value).__name__})
    return value, 0.3


def validate_extracted_data(
    data: dict[str, Any],
    schema: dict[str, str] | None = None,
) -> dict[str, Any]:
    if schema is None:
        return {
            "valid": True,
            "data": data,
            "confidence": 1.0,
            "field_scores": {},
            "issues": [],
        }

    validated: dict[str, Any] = {}
    field_scores: dict[str, float] = {}
    issues: list[str] = []

    for field_name, expected_type in schema.items():
        raw_value = data.get(field_name)
        validated_value, score = validate_field_type(raw_value, expected_type, field_name)
        validated[field_name] = validated_value
        field_scores[field_name] = score

        if validated_value is None:
            issues.append(f"missing field: {field_name}")

    for extra_key in data:
        if extra_key not in schema:
            validated[extra_key] = data[extra_key]
            field_scores[extra_key] = 0.5
            issues.append(f"unexpected field: {extra_key}")

    confidence = (
        sum(field_scores.values()) / len(field_scores)
        if field_scores
        else 1.0
    )

    return {
        "valid": confidence >= 0.5,
        "data": validated,
        "confidence": round(confidence, 4),
        "field_scores": field_scores,
        "issues": issues,
    }


def normalize_ocr_fields(data: dict[str, Any]) -> dict[str, Any]:
    result = dict(data)

    for key, value in result.items():
        if isinstance(value, str):
            result[key] = " ".join(value.split()).strip()

    date_keys = [k for k in result if "date" in k.lower()]
    for key in date_keys:
        if isinstance(result.get(key), str):
            parsed = parse_date(result[key])
            if parsed:
                result[key] = parsed

    email_keys = [k for k in result if "email" in k.lower()]
    for key in email_keys:
        if isinstance(result.get(key), str):
            if not EMAIL_PATTERN.match(result[key]):
                logger.warning("invalid email format", extra={"field": key, "value": result[key]})

    return result


def score_ocr_quality(text: str) -> dict[str, Any]:
    if not text:
        return {"score": 0.0, "issues": ["empty text"]}

    issues: list[str] = []
    score = 1.0

    char_count = len(text)
    MIN_CHARS = 10
    MIN_WORDS = 3
    ALPHA_LOW_RATIO = 0.3
    ALPHA_MODERATE_RATIO = 0.5
    SHORT_TEXT_PENALTY = 0.3
    FEW_WORDS_PENALTY = 0.2
    LOW_ALPHA_PENALTY = 0.2
    MODERATE_ALPHA_PENALTY = 0.1
    REPETITION_PENALTY = 0.2
    GARBAGE_PENALTY = 0.3
    GARBAGE_THRESHOLD = 0.01

    if char_count < MIN_CHARS:
        score -= SHORT_TEXT_PENALTY
        issues.append("very short text")

    word_count = len(text.split())
    if word_count < MIN_WORDS:
        score -= FEW_WORDS_PENALTY
        issues.append("fewer than 3 words")

    alpha_ratio = sum(1 for c in text if c.isalpha()) / max(char_count, 1)
    if alpha_ratio < ALPHA_LOW_RATIO:
        score -= LOW_ALPHA_PENALTY
        issues.append("low alphabetic content ratio")
    elif alpha_ratio < ALPHA_MODERATE_RATIO:
        score -= MODERATE_ALPHA_PENALTY
        issues.append("moderate alphabetic content ratio")

    repeated_pattern = re.search(r"(.)\1{4,}", text)
    if repeated_pattern:
        score -= REPETITION_PENALTY
        issues.append("contains character repetition (possible noise)")

    garbage_ratio = sum(1 for c in text if c in "�\x00\x01\x02\x1a") / max(char_count, 1)
    if garbage_ratio > GARBAGE_THRESHOLD:
        score -= GARBAGE_PENALTY
        issues.append("contains non-printable characters")

    return {
        "score": round(max(0.0, score), 4),
        "issues": issues,
        "char_count": char_count,
        "word_count": word_count,
    }


def apply_guardrails(prompt: str, additional_rules: list[str] | None = None) -> str:
    rules = [
        "Output ONLY valid JSON. No markdown fences, no explanations.",
        "If a field is not visible in the image, use null. Never guess.",
        "Dates must be in YYYY-MM-DD format.",
        "Numbers must be numeric types (not strings).",
        "Do not include any text before or after the JSON object.",
    ]

    if additional_rules:
        rules.extend(additional_rules)

    rules_text = "\n".join(f"- {rule}" for rule in rules)

    guardrail_section = f"""
CRITICAL RULES:
{rules_text}

REMINDER: Output ONLY valid JSON. No markdown, no explanations.
"""

    if "CRITICAL RULES:" in prompt:
        prompt = re.sub(r"CRITICAL RULES:.*?REMINDER:.*?(?=\n|$)", guardrail_section.strip(), prompt, flags=re.DOTALL)
        return prompt

    return prompt.strip() + "\n" + guardrail_section
