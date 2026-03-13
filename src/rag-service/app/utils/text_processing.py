import re
import unicodedata


def clean_text(text: str) -> str:
    """Normalize and clean raw document text for chunking/embedding."""
    # Normalize unicode (e.g. accented chars)
    text = unicodedata.normalize("NFKC", text)
    # Replace multiple whitespace/newlines with single space
    text = re.sub(r"\s+", " ", text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def normalize_for_comparison(text: str) -> str:
    """Aggressive normalization for plagiarism comparison.

    Lowercases, strips punctuation, collapses whitespace.
    """
    text = text.lower()
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
