import time
from fastapi import FastAPI, Request
from fastapi.responses import Response
from app.utils.logger import get_logger

logger = get_logger(__name__)


def add_timing_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def timing_middleware(request: Request, call_next) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration = time.perf_counter() - start
        response.headers["X-Process-Time-Ms"] = str(round(duration * 1000, 2))

        logger.info(
            "request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            },
        )

        return response
