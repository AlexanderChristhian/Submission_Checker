from fastapi import FastAPI
from app.config import settings
from app.utils.logger import get_logger

# Configure LlamaIndex BEFORE importing any modules that use LlamaIndex
# This ensures global settings are set before LlamaIndex defaults are used
from app.core.llama_settings import configure_llama_index
configure_llama_index()

# Now import the router which imports services that use LlamaIndex
from app.api.routes import router

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
