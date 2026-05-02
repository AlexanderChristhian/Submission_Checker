# Stage 1: Dependencies
FROM python:3.11-slim AS deps

WORKDIR /app

# Install system dependencies for LlamaIndex and embeddings
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Builder - Download models
FROM deps AS builder

# Pre-download BGE-M3 model (optional, can be done at runtime)
# This reduces first-request latency
ENV HF_HOME=/root/.cache/huggingface
RUN python -c "from llama_index.embeddings.huggingface import HuggingFaceEmbedding; \
    HuggingFaceEmbedding(model_name='BAAI/bge-m3')"

# Stage 3: Production
FROM python:3.11-slim AS production

WORKDIR /app

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/
COPY .env.example ./.env
COPY pyproject.toml ./

# Create non-root user for security
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Create data directory
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]