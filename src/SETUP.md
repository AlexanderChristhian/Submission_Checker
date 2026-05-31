# Submission Checker — Full Project Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                         │
│                    http://localhost:3000                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────────┐
│                     Backend (Express.js + TS)                       │
│                    http://localhost:3001                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Course CRUD   │  │ Submissions   │  │ Graph Analytics          │  │
│  │ routes        │  │ routes       │  │ routes                   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────────────┘  │
│         │                 │                    │                    │
│         ▼                 ▼                    ▼                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Services Layer                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │ Prisma ORM   │  │ Neo4j Driver │  │ RAG HTTP Client  │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │  │
│  └─────────┼─────────────────┼───────────────────┼──────────────┘  │
└────────────┼─────────────────┼───────────────────┼────────────────┘
             │                 │                   │
             ▼                 ▼                   ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
     │  PostgreSQL  │  │    Neo4j     │  │   RAG Service    │
     │  (port 5432) │  │  (port 7687) │  │  FastAPI (8000)  │
     └──────────────┘  └──────────────┘  └────────┬─────────┘
                                                   │
                                     ┌─────────────┼─────────────┐
                                     ▼             ▼             ▼
                               ┌──────────┐ ┌──────────┐ ┌──────────┐
                               │ ChromaDB │ │  BGE-M3  │ │  Ollama  │
                               │ Vector DB│ │Embeddings│ │   LLM    │
                               └──────────┘ └──────────┘ └──────────┘
```

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Backend + Frontend runtime |
| npm | >= 10 | Package management |
| Python | >= 3.11 | RAG service runtime |
| Docker | >= 24.0 | Containerized deployment |
| Docker Compose | >= 2.24 | Multi-service orchestration |
| kubectl | >= 1.28 | Kubernetes management |
| minikube or kind | latest | Local Kubernetes cluster |
| Ollama | latest | Local LLM (for RAG queries) |

## Environment Configuration

### Backend (`src/backend/.env`)

```ini
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/submission_checker"
JWT_SECRET="your-super-secret-jwt-key"
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="password"
RAG_SERVICE_URL="http://localhost:8000"
```

### RAG Service (`src/rag-service/.env`)

```ini
CHROMA_DB_PATH=./data/chroma_db
CHROMA_COLLECTION_NAME=submissions
BGE_M3_MODEL=BAAI/bge-m3
BGE_M3_USE_FP16=true
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key-here
GEMINI_API_KEY=your-gemini-api-key
OLLAMA_BASE_URL=http://localhost:11434
CHUNK_SIZE=512
CHUNK_OVERLAP=50
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
HOST=0.0.0.0
PORT=8000
```

---

## 1. Running Without Docker (Local Development)

### 1.1 Start Infrastructure Dependencies

You need PostgreSQL and Neo4j running locally. The easiest way is using Docker for just the databases:

```bash
# Start PostgreSQL + Neo4j
docker run -d --name postgres \
  -e POSTGRES_DB=submission_checker \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name neo4j \
  -e NEO4J_AUTH=neo4j/password \
  -p 7687:7687 -p 7474:7474 \
  neo4j:5-community
```

### 1.2 Backend (Express.js + TypeScript)

```bash
cd src/backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) seed the database
npx tsx src/scripts/seed.ts

# Build TypeScript
npm run build

# Start in development mode (auto-restart on changes)
npm run dev

# Or start in production mode
npm run build && npm start
```

The backend starts on **http://localhost:3001** with these endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/courses` | List courses |
| `POST /api/courses` | Create course |
| `GET /api/submissions` | List submissions |
| `POST /api/submissions` | Create submission |
| `GET /api/analytics/*` | Graph analytics (20 endpoints) |
| `GET /api/plagiarism/*` | Plagiarism reports |

### 1.3 RAG Service (Python FastAPI)

Set up a Python virtual environment and install dependencies:

```bash
cd src/rag-service

# Create virtual environment
python -m venv .venv

# Activate it
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The RAG service starts on **http://localhost:8000** with OpenAPI docs at **http://localhost:8000/docs**.

Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (reports degraded if Neo4j is down) |
| `POST /index/file` | Index a document file |
| `POST /index` | Index raw text |
| `POST /query/rag` | RAG query with LLM synthesis |
| `POST /query/search` | Raw search results (no LLM) |
| `POST /query/hybrid` | Hybrid vector + BM25 search |
| `POST /query/hybrid-graph` | Hybrid vector + Neo4j graph search |
| `POST /query/graphrag` | GraphRAG: vector + graph enrichment + LLM |
| `POST /query/multi-step` | Multi-step query with decomposition |
| `POST /vlm/extract` | VLM OCR extraction from image |
| `POST /vlm/ocr/index` | VLM OCR + auto-index into ChromaDB |
| `POST /vlm/compare` | Compare all VLM providers |
| `POST /graph/query` | Execute arbitrary Cypher queries |
| `GET /graph/stats` | Neo4j node + relationship counts |
| `GET /graph/nodes` | Node counts grouped by label |

### 1.4 Frontend (Next.js)

```bash
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend starts on **http://localhost:3000**.

| Script | Command |
|--------|---------|
| Development | `npm run dev` |
| Production build | `npm run build && npm start` |
| Lint | `npm run lint` |

### 1.5 LLM Setup (Ollama — Optional but Recommended)

```bash
# Install Ollama: https://ollama.com

# Pull a model for RAG queries
ollama pull llama3.1:8b

# Verify it's running
ollama list
```

The RAG service uses Ollama by default (`LLM_PROVIDER=ollama`). Point it at `http://localhost:11434`.

---

## 2. Running With Docker Compose

The `docker-compose.yml` at `src/docker-compose.yml` orchestrates 4 services: backend, rag-service, PostgreSQL, and Neo4j.

**Important:** Before running with Docker Compose, you must set the `GEMINI_API_KEY` in `src/rag-service/.env` (or any VLM provider key) for VLM OCR features. For basic RAG (without VLM), the default Ollama config works out of the box.

### 2.1 First-Time Setup

```bash
cd src

# Build and start all services
docker compose up --build -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### 2.2 Service URLs (Docker Compose)

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Backend | `http://backend:3001` | `http://localhost:8080` |
| RAG Service | `http://rag-service:8000` | `http://localhost:8000` |
| PostgreSQL | `postgres://postgres:password@db:5432/submission_checker` | `localhost:5432` |
| Neo4j | `bolt://neo4j:7687` | `bolt://localhost:7687` |

Neo4j Browser: **http://localhost:7474** (credentials: `neo4j`/`password`)

### 2.3 Useful Commands

```bash
# Rebuild a single service
docker compose build backend
docker compose up -d backend

# Run database migrations inside the container
docker compose exec backend npx prisma db push

# View logs for a specific service
docker compose logs -f rag-service

# Run tests inside a container
docker compose exec rag-service python -m pytest tests/

# Stop everything
docker compose down

# Stop and delete all data volumes
docker compose down -v
```

### 2.4 Health Check Dependencies

The compose file uses `depends_on` with `condition: service_healthy` to ensure databases are ready before the backend starts:

- **PostgreSQL**: verified via `pg_isready`
- **Neo4j**: verified via HTTP `curl` on port 7474
- **RAG Service**: verified via `/health` endpoint with 40s startup grace period

---

## 3. Running With Kubernetes

Kubernetes manifests are in the `k8s/` directory. These are designed for a local cluster (minikube or kind).

### 3.1 Local Cluster Setup (minikube)

```bash
# Install minikube: https://minikube.sigs.k8s.io/docs/start/

# Start cluster
minikube start --cpus 4 --memory 8192

# Enable ingress addon
minikube addons enable ingress

# Point shell to minikube's Docker daemon
eval $(minikube docker-env)
```

### 3.2 Build Docker Images Inside Cluster

```bash
# Point to minikube's Docker daemon
eval $(minikube docker-env)

# Build backend image
docker build -t backend:latest src/backend

# Build rag-service image
docker build -t rag-service:latest src/rag-service
```

### 3.3 Deploy All Resources

```bash
cd k8s

# Create namespace (optional)
kubectl create namespace submission-checker
kubectl config set-context --current --namespace=submission-checker

# Apply in order: ConfigMap → Secrets → Services → Deployments
kubectl apply -f backend-configmap.yaml
kubectl apply -f backend-secrets-template.yaml

# Deploy databases first (PostgreSQL + Neo4j from Helm or manifests)
# For quick local testing, use Docker Compose for databases and k8s for apps

# Deploy services
kubectl apply -f backend-service.yaml

# Deploy deployments
kubectl apply -f backend-deployment.yaml
kubectl apply -f rag-service-deployment.yaml

# Deploy HPA (auto-scaling)
kubectl apply -f backend-hpa.yaml
kubectl apply -f rag-service-hpa.yaml
```

### 3.4 Verify Deployment

```bash
# Check pod status
kubectl get pods -w

# Check services
kubectl get svc

# Check HPA status
kubectl get hpa

# View logs
kubectl logs -l app=backend
kubectl logs -l app=rag-service

# Port-forward for local access
kubectl port-forward deployment/backend-deployment 8080:8080
kubectl port-forward deployment/rag-service-deployment 8000:8000
```

### 3.5 Rolling Updates

```bash
# Update image and trigger rolling update
kubectl set image deployment/backend-deployment backend=backend:v2

# Check rollout status
kubectl rollout status deployment/backend-deployment

# Rollback if needed
kubectl rollout undo deployment/backend-deployment
```

### 3.6 Scaling

```bash
# Manual scale
kubectl scale deployment/backend-deployment --replicas=5

# HPA auto-scales based on CPU (70%) and memory (80%)
# Configured in backend-hpa.yaml and rag-service-hpa.yaml
```

### 3.7 Clean Up

```bash
kubectl delete -f k8s/
minikube stop
```

### 3.8 Hybrid: Docker Compose for Databases + k8s for Apps

For development with k8s, a practical approach is running databases via Docker Compose and apps via Kubernetes:

```bash
# Start databases only
cd src
docker compose up -d db neo4j

# Then deploy apps to k8s (pointing to localhost for databases)
cd ../k8s
kubectl apply -f backend-deployment.yaml
kubectl apply -f rag-service-deployment.yaml
```

---

## 4. Running Tests

### 4.1 RAG Service Tests (Python / pytest)

All test files are in `src/rag-service/tests/`.

```bash
cd src/rag-service

# Activate virtual environment
source .venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_evaluation.py -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=term

# Run a single test function
python -m pytest tests/test_vlm_upload_validation.py::test_validate_vlm_upload_file_accepts_png -v

# Run chunking comparison experiment (standalone script)
python -m tests.test_chunking_comparison
```

**Important:** Some tests require external services:
- `test_evaluation.py` and `test_graph_evaluation.py` require a running RAG service with ChromaDB and Neo4j
- `test_indexing.py` requires ChromaDB
- `test_vlm_upload_validation.py` is self-contained (no external deps)
- `test_routes.py` requires a running service
- `test_chunking_comparison.py` requires ChromaDB to be seeded with documents

To run tests that don't require external services:

```bash
python -m pytest tests/test_vlm_upload_validation.py -v
```

#### Test Descriptions

| Test File | Description | Dependencies |
|-----------|-------------|--------------|
| `test_vlm_upload_validation.py` | VLM file upload validation (MIME types, signatures, sizes) | None |
| `test_indexing.py` | Document indexing pipeline | ChromaDB |
| `test_routes.py` | API endpoint integration tests | Full service stack |
| `test_evaluation.py` | RAG evaluation metrics (retrieval, generation, latency) | Full service stack |
| `test_graph_evaluation.py` | Graph retrieval comparison (vector vs hybrid vs GraphRAG) | Full service + Neo4j |
| `test_chunking_comparison.py` | Chunking strategy experiment (5 configs × 10 queries) | ChromaDB with indexed docs |

### 4.2 Backend Tests

The backend does not have dedicated test files yet. To verify the backend is working:

```bash
cd src/backend

# Build and start
npm run build && npm start

# Test health endpoint
curl http://localhost:3001/health

# Test API endpoints
curl http://localhost:3001/api/courses
```

### 4.3 Frontend Lint

```bash
cd src/frontend

# Run ESLint
npm run lint
```

---

## 5. Quick Start Decision Tree

```
What do you want to do?
│
├─ **Full stack with minimal setup**
│   → docker compose up --build -d
│   → Access: backend (8080), rag-service (8000), frontend (3000)
│
├─ **Develop a single service locally**
│   → Start databases: docker compose up -d db neo4j
│   → Start your service (section 1)
│
├─ **Test Kubernetes deployment**
│   → minikube start
│   → eval $(minikube docker-env)
│   → Build images → kubectl apply -f k8s/
│
├─ **Run tests**
│   → cd src/rag-service && source .venv/bin/activate
│   → python -m pytest tests/test_vlm_upload_validation.py -v  (no deps)
│   → python -m pytest tests/ -v  (full service required)
│
└─ **RAG query workflow**
    1. Start Ollama: ollama pull llama3.1:8b
    2. Start rag-service: uvicorn app.main:app --reload
    3. Index a document: POST /index/file
    4. Query: POST /query/rag with {"query": "your question", "top_k": 5}
```

## 6. Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Neo4j connection refused | Neo4j not running | `docker compose up -d neo4j` |
| ChromaDB errors | Missing `data/chroma_db` directory | Create dir or let app create it on first run |
| `ModuleNotFoundError: openai` | Missing Python deps | `pip install -r requirements.txt` |
| `tsc-watch not found` | Missing dev deps | `npm install` in backend/ |
| Prisma client error | Client not generated | `npx prisma generate` |
| Port already in use | Another service on same port | Change PORT in `.env` or stop the other service |
| Ollama connection timeout | Ollama not running | `ollama serve` or `ollama pull llama3.1:8b` |
| Docker build fails (Python) | ARM vs x86 architecture | Use `--platform linux/amd64` flag |
| k8s ImagePullBackOff | Image not in cluster's Docker daemon | Rebuild with `eval $(minikube docker-env)` first |
| Pod CrashLoopBackOff | App throws on startup | `kubectl logs <pod-name>` to diagnose |
| Slow first RAG query | BGE-M3 model downloading | Wait for model download on first run (~500MB) |
