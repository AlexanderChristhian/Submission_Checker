from fastapi import FastAPI
from app.api.routes import router
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="DigiChecker RAG Service",
    description="LlamaIndex + BGE-M3 + ChromaDB RAG service for submission analysis",
    version="0.1.0",
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    logger.info(
        "RAG service starting",
        extra={"host": settings.host, "port": settings.port},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
