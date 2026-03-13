from app.utils.text_processing import clean_text, normalize_for_comparison
from app.core.indexing import chunk_document


def test_clean_text_collapses_whitespace():
    raw = "  Hello    world\n\nfoo   bar  "
    assert clean_text(raw) == "Hello world foo bar"


def test_normalize_for_comparison():
    text = "Hello, World! This is a Test."
    result = normalize_for_comparison(text)
    assert result == "hello world this is a test"


def test_chunk_document_produces_chunks():
    content = "This is a test document. " * 100
    chunks = chunk_document(content, submission_id=1)
    assert len(chunks) >= 1
    assert chunks[0]["metadata"]["submission_id"] == 1
    assert chunks[0]["metadata"]["chunk_index"] == 0
