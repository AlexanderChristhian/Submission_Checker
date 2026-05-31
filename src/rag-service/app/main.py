from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.utils.logger import get_logger

# Configure LlamaIndex BEFORE importing any modules that use LlamaIndex
from app.core.llama_settings import configure_llama_index
configure_llama_index()

from app.api.routes import router
from app.core.neo4j_client import neo4j_client
from app.middleware.timing import add_timing_middleware

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
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_timing_middleware(app)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
