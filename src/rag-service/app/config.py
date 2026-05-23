from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ChromaDB
    chroma_db_path: str = "./data/chroma_db"
    chroma_collection_name: str = "submissions"

    # BGE-M3
    bge_m3_model: str = "BAAI/bge-m3"
    bge_m3_use_fp16: bool = True

    # LLM
    llm_provider: str = "ollama"  # openai | ollama
    llm_model: str = "llama3.1:8b"  # model name for ollama
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # Chunking
    chunk_size: int = 512 
    chunk_overlap: int = 50

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env"}


settings = Settings()
