from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.utils.logger import get_logger

# Configure LlamaIndex BEFORE importing any modules that use LlamaIndex
# This ensures global settings are set before LlamaIndex defaults are used
from app.core.llama_settings import configure_llama_index
configure_llama_index()

# Now import the router which imports services that use LlamaIndex
from app.api.routes import router

# Import Neo4j client for lifecycle management
from app.core.neo4j_client import neo4j_client

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RAG service starting", extra={"host": settings.host, "port": settings.port})
    try:
        await neo4j_client.connect()
    except Exception as e:
        logger.warning("Neo4j connection failed — graph features unavailable: %s", e)
    yield
    await neo4j_client.close()
    logger.info("RAG service stopped")


app = FastAPI(
    title="DigiChecker RAG Service",
    description="LlamaIndex + BGE-M3 + ChromaDB RAG service for submission analysis",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
