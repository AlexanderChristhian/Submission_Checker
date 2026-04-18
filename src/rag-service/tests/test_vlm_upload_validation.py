import io

import pytest
from fastapi import HTTPException
from starlette.datastructures import UploadFile

from app.api import routes


def _make_upload(filename: str, payload: bytes, content_type: str = "application/octet-stream") -> UploadFile:
    return UploadFile(
        filename=filename,
        file=io.BytesIO(payload),
        headers={"content-type": content_type},
    )


def test_validate_vlm_upload_file_accepts_png():
    png_payload = b"\x89PNG\r\n\x1a\n" + b"0" * 32
    upload = _make_upload("submission.png", png_payload, "image/png")

    suffix, mime_type, size_bytes = routes._validate_vlm_upload_file(upload)

    assert suffix == ".png"
    assert mime_type == "image/png"
    assert size_bytes == len(png_payload)


def test_validate_vlm_upload_file_rejects_extension_signature_mismatch():
    png_payload = b"\x89PNG\r\n\x1a\n" + b"0" * 32
    upload = _make_upload("submission.jpg", png_payload, "image/jpeg")

    with pytest.raises(HTTPException) as exc:
        routes._validate_vlm_upload_file(upload)

    assert exc.value.status_code == 415
    assert "does not match file signature" in str(exc.value.detail)


def test_validate_vlm_upload_file_rejects_invalid_content_type():
    jpeg_payload = b"\xff\xd8\xff" + b"0" * 32
    upload = _make_upload("submission.jpg", jpeg_payload, "video/mp4")

    with pytest.raises(HTTPException) as exc:
        routes._validate_vlm_upload_file(upload)

    assert exc.value.status_code == 415
    assert "Unsupported content type" in str(exc.value.detail)


def test_validate_vlm_upload_file_rejects_oversized_payload(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(routes, "MAX_VLM_UPLOAD_BYTES", 16)
    jpeg_payload = b"\xff\xd8\xff" + b"0" * 32
    upload = _make_upload("submission.jpg", jpeg_payload, "image/jpeg")

    with pytest.raises(HTTPException) as exc:
        routes._validate_vlm_upload_file(upload)

    assert exc.value.status_code == 413
    assert "too large" in str(exc.value.detail)
