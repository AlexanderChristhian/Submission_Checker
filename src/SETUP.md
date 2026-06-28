# Submission Checker — Full Project Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js 16)                      │
│                    http://localhost:3000                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (proxy /api/* → backend)
┌───────────────────────────▼─────────────────────────────────────────┐
│                     Backend (Express 5 + TS)                        │
│                    http://localhost:3001                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┐  │
│  │ Auth (BA)    │  │ Submissions  │  │ Grades   │  │ Graph    │  │  │
│  │ /api/auth/*  │  │ /api/subm.. │  │ /api/... │  │ Analytics│  │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └──────────┘  │  │
│         │                 │               │                       │  │
│         ▼                 ▼               ▼                       ▼  │
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
     │  (Neon DB)   │  │  (port 7687) │  │  FastAPI (8000)  │
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
| Ollama | latest | Local LLM (for RAG queries) |

## Environment Configuration

### Backend (`src/backend/.env`)

```ini
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@host:port/db?sslmode=require&pgbouncer=true"
BETTER_AUTH_SECRET="your-better-auth-secret-32-chars-min"
BETTER_AUTH_URL="http://localhost:3000"
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

You need PostgreSQL and Neo4j running locally:

```bash
# Start PostgreSQL (or use a cloud provider like Neon)
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

# Push schema to database (drops & recreates tables)
npx prisma db push --force-reset

# Build TypeScript
npm run build

# Start in development mode (auto-restart on changes)
npm run dev

# Or start in production mode
npm run build && npm start
```

The backend starts on **http://localhost:3001** with these endpoints:

**Auth (Better Auth)**

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/sign-up/email` | Create account |
| `POST /api/auth/sign-in/email` | Sign in |
| `POST /api/auth/sign-out` | Sign out |
| `GET /api/auth/get-session` | Get current session |

**Data**

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/courses` | List courses |
| `POST /api/courses` | Create course |
| `GET /api/submissions` | List submissions |
| `POST /api/submissions` | Create submission |
| `GET /api/submissions/:id` | Get submission |
| `PUT /api/submissions/:id` | Update submission |
| `DELETE /api/submissions/:id` | Delete submission |
| `POST /api/submissions/:id/grade` | Auto-grade submission |
| `POST /api/rag/index` | Index document in RAG |
| `GET /api/analytics/*` | Graph analytics |
| `GET /api/plagiarism/*` | Plagiarism reports |
| `GET /api/grading-rules` | List grading rules |
| `POST /api/grading-rules` | Create grading rule |
| `PUT /api/grading-rules/:id` | Update grading rule |
| `DELETE /api/grading-rules/:id` | Delete grading rule |

### 1.3 RAG Service (Python FastAPI)

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

**Additional endpoint (v0.2+):**

| Endpoint | Description |
|----------|-------------|
| `POST /evaluate` | LLM-based grading — returns score + list of deductions |
| `POST /vlm/extract` | VLM OCR extraction from image |
| `POST /vlm/ocr/index` | VLM OCR + auto-index into ChromaDB |

### 1.4 Frontend (Next.js 16)

```bash
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend starts on **http://localhost:3000**.

### 1.5 LLM Setup (Ollama — Optional but Recommended)

```bash
# Install Ollama: https://ollama.com

# Pull a model for RAG queries
ollama pull llama3.1:8b

# Verify it's running
ollama list
```

---

## 2. Running With Docker Compose

The `docker-compose.yml` at `src/docker-compose.yml` orchestrates the services.

```bash
cd src

# Build and start all services
docker compose up --build -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### Service URLs (Docker Compose)

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Backend | `http://backend:3001` | `http://localhost:8080` |
| RAG Service | `http://rag-service:8000` | `http://localhost:8000` |
| PostgreSQL | `postgres://postgres:password@db:5432/submission_checker` | `localhost:5432` |
| Neo4j | `bolt://neo4j:7687` | `bolt://localhost:7687` |

Neo4j Browser: **http://localhost:7474** (credentials: `neo4j`/`password`)

### Useful Commands

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

---

## 3. Running With Kubernetes

Kubernetes manifests are in the `k8s/` directory. These are designed for a local cluster (minikube or kind).

### 3.1 Prerequisites

```bash
# Start local cluster
minikube start --cpus 4 --memory 8192

# Or with kind
kind create cluster --name submission-checker
```

### 3.2 Build Docker Images

```bash
cd src

# Build backend image
docker build -t backend:latest backend

# Build rag-service image
docker build -t rag-service:latest rag-service

# If using minikube, build inside the cluster's Docker daemon
eval $(minikube docker-env)
docker build -t backend:latest backend
docker build -t rag-service:latest rag-service
```

### 3.3 Deploy All Resources

Apply in order: namespace → secrets → configmaps → databases → apps.

```bash
cd k8s

# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. (Required) Edit secrets first — at minimum change BETTER_AUTH_SECRET
#    kubectl edit -f backend-secrets.yaml
kubectl apply -f backend-secrets.yaml

# 3. ConfigMaps
kubectl apply -f backend-configmap.yaml
kubectl apply -f rag-service-configmap.yaml

# 4. Databases
kubectl apply -f db-deployment.yaml
kubectl apply -f neo4j-deployment.yaml

# 5. App services
kubectl apply -f backend-deployment.yaml
kubectl apply -f rag-service-deployment.yaml
```

### 3.4 Verify

```bash
# Watch pods come up
kubectl get pods -n submission-checker -w

# Should show all pods as Running
NAME                           READY   STATUS    RESTARTS
backend-7d9f6c8b5f-xk2lj      1/1     Running   0
rag-service-6b5f4d9c78-8j2kl  1/1     Running   0
db-5f6c8b5f7d-abc12           1/1     Running   0
neo4j-9f6c8b5f7-xyz34          1/1     Running   0
```

### 3.5 Access Services

```bash
# Port-forward backend for local access
kubectl port-forward -n submission-checker deployment/backend 8080:8080

# Port-forward rag-service
kubectl port-forward -n submission-checker deployment/rag-service 8000:8000

# Neo4j Browser
kubectl port-forward -n submission-checker deployment/neo4j 7474:7474
# Open http://localhost:7474 (credentials: neo4j / password)
```

### 3.6 Run Schema Sync

```bash
# After DB is running, push the Prisma schema
kubectl exec -n submission-checker deployment/backend -- npx prisma db push
```

### 3.7 Clean Up

```bash
kubectl delete namespace submission-checker
minikube stop    # if using minikube
kind delete cluster --name submission-checker  # if using kind
```

### Manifests in `k8s/`

| File | What it creates |
|------|----------------|
| `namespace.yaml` | `submission-checker` namespace |
| `backend-secrets.yaml` | DB URL, Better Auth secret, Neo4j password, Gemini API key |
| `backend-configmap.yaml` | Env vars for backend (port, Neo4j URI, RAG URL) |
| `backend-deployment.yaml` | Backend Deployment (port 8080) + ClusterIP Service |
| `rag-service-configmap.yaml` | Env vars for RAG service (Ollama URL, ChromaDB path) |
| `rag-service-deployment.yaml` | RAG Service Deployment (port 8000) + ClusterIP Service |
| `db-deployment.yaml` | PostgreSQL 15 Deployment + ClusterIP Service |
| `neo4j-deployment.yaml` | Neo4j 5 Deployment (bolt 7687, http 7474) + ClusterIP Service |

**Important notes:**
- PostgreSQL and Neo4j use `emptyDir` volumes — data is lost when pods restart. For production, use `PersistentVolumeClaim` instead.
- The RAG service connects to Ollama at `http://host.docker.internal:11434` — adjust if running Ollama elsewhere.
- Before deploying, edit `backend-secrets.yaml` to change `BETTER_AUTH_SECRET` to a random 32+ character string.

---

## 4. Prisma Schema Overview

The Prisma schema (`src/backend/prisma/schema.prisma`) includes:

**Better Auth models:**
- `user` — Users with roles (STUDENT, LECTURER, ADMIN), `id` is a cuid string
- `session` — Auth sessions
- `account` — OAuth / email accounts (stores hashed password for email auth)
- `verification` — Email verification tokens

**Application models:**
- `Course` — Academic courses
- `Assignment` — Course assignments
- `Submission` — Student submissions (FK to `user.id` as string)
- `Grade` — Grades for submissions (FK to `user.gradedById` as string?), unique per `submissionId`
- `GradingRule` — Grading rubrics (markdown, scoped to course or global)
- `PlagiarismReport` — Plagiarism similarity reports
- `AuditLog` — Action audit trail

To sync the schema after changes:

```bash
cd src/backend
npx prisma db push --force-reset   # Drops all data — safe for dev
# or
npx prisma db push                  # Non-destructive sync
```

---

## 5. Grading Rules Workflow

Grading rules allow admins to define rubrics that guide the LLM when auto-grading submissions.

### How it works

1. Admin creates a rule via the **Admin** page (`/routes/Admin`) — markdown content with deduction criteria
2. Rules can be **Global** (applies to all courses) or scoped to a specific **Course**
3. When a submission is graded (`POST /api/submissions/:id/grade`), the backend:
   - Looks for the most specific active rule: `courseId match → global fallback`
   - Injects the rule content as the **system prompt** to the LLM
   - The LLM evaluates the submission against the rule and returns deductions
4. Rules are editable at any time — changes apply on the **next** grade request (no restart needed)

### Admin page

The frontend Admin page at `/routes/Admin` provides:
- List all rules with course / global scope
- Create / Edit / Delete rules
- Inline markdown textarea with toggle preview
- Active/inactive toggle to disable rules without deleting

### Example grading rule (markdown)

```markdown
# CPU Microarchitecture Rubric

## Deductions
- -2 points for each missing control signal (CNT, ADD, SUB, etc.)
- -5 points if micro-routine does not return to SEQ_FETCH
- -5 points if waveform shows infinite loop

## Requirements
- All ALU operations must set the CNT flag
- Micro-routines must return to SEQ_FETCH after completion
- Waveform must show correct fetch-execute cycle
```

---

## 6. Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Neo4j connection refused | Neo4j not running | `docker compose up -d neo4j` |
| ChromaDB errors | Missing `data/chroma_db` directory | Create dir or let app create it on first run |
| `ModuleNotFoundError` | Missing Python deps | `pip install -r requirements.txt` |
| `tsc-watch not found` | Missing dev deps | `npm install` in backend/ |
| Prisma client error | Client not generated | `npx prisma generate` |
| Port already in use | Another service on same port | Change PORT in `.env` or stop the other service |
| Cached plan error (PostgreSQL) | Stale prepared statement | Add `?pgbouncer=true` to DATABASE_URL |
| Auth 502 error | Backend not running | Start backend on port 3001 |
| Auth: Expected Int, got String | User id type mismatch | Run `prisma db push --force-reset` to sync schema |
| Ollama connection timeout | Ollama not running | `ollama serve` or `ollama pull llama3.1:8b` |
| Docker build fails (Python) | ARM vs x86 architecture | Use `--platform linux/amd64` flag |
| Slow first RAG query | BGE-M3 model downloading | Wait for model download on first run (~500MB) |
