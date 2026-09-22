# MineIntel On-Premise Production Deployment

This document outlines the Phase 4 deployment specifications for deploying the MineIntel Agent and FastAPI backend into a secure, on-premise Ubuntu server environment using Docker. 

## Architectural Overview
- **Frontend**: Hosted entirely on Vercel. Connects securely to the on-premise backend API.
- **Backend**: Hosted on-premise on Ubuntu via Docker (FastAPI).
- **AI Runtime**: Hosted on-premise on Ubuntu via Docker (Ollama).
- **Database**: External existing Neon PostgreSQL database (with JSONB state).

> [!CAUTION]
> Ollama must NEVER be exposed directly to the public internet or the Vercel frontend. Only the FastAPI backend routes should be exposed externally via a Secure Gateway or VPN.

## 1. Prerequisites
- **OS**: Ubuntu 22.04 LTS (or compatible Linux distribution)
- **Hardware**: Dedicated GPU recommended for Ollama inference (NVIDIA RTX / Data Center GPUs).
- **Docker**: Docker Engine 24.0+ and Docker Compose v2+.
- **NVIDIA Container Toolkit**: Required if exposing GPUs to Docker.

## 2. Setting Up the Environment

1. **Clone the repository** to the on-premise server.
2. **Copy the environment file**:
   ```bash
   cp .env.example .env
   ```
3. **Configure the `.env` file**. You must strictly populate:
   - `MINEINTEL_OFFICER_ID`: Master Officer ID for system administration.
   - `MINEINTEL_AUTH_PASSWORD`: Master Enclave Password.
   - `MINEINTEL_JWT_SECRET`: Secure randomly generated string for JWT signing.
   - `DATABASE_URL`: Connection string to the existing Neon PostgreSQL database.
   - `CORS_ORIGINS`: The exact URL of the Vercel frontend (e.g., `https://mineintel-frontend.vercel.app`). Do not use `*`.

## 3. Ollama Installation & Model Requirements
Ollama runs as an isolated container alongside the backend. The backend accesses it via the internal Docker network (`http://ollama:11434`).

> [!IMPORTANT]
> The MineIntel Agent is explicitly designed, tuned, and verified against `qwen2.5:7b` (Text) and `qwen2-vl:7b` (Vision). These models are strictly required. The backend will return a `MODEL_UNAVAILABLE` error if these specific models are not pulled.

Once the containers are started, pull the required models into the Ollama volume:
```bash
docker exec -it ollama ollama pull qwen2.5:7b
docker exec -it ollama ollama pull qwen2-vl:7b
```

## 4. Starting the Infrastructure
Ensure Docker and Docker Compose are installed. 

Start the backend and Ollama services:
```bash
docker-compose up -d --build
```
This spawns:
- `mineintel-backend` (Port `8000`)
- `ollama` (Isolated to Docker network)

## 5. Security & Gateway Configuration
The frontend (Vercel) must communicate with the on-premise backend (Port 8000). 
- **Secure Gateway/VPN**: UNKNOWN — REQUIRES INFRASTRUCTURE DECISION. The organization must provision a secure reverse proxy (e.g., Nginx, Cloudflare Tunnel, or internal VPN Endpoint) that securely exposes Port 8000 to the Vercel environment over HTTPS.
- **CORS**: Ensure `CORS_ORIGINS` exactly matches the Vercel app's URL.

## 6. Health & Readiness Checking
The backend exposes explicit health checkpoints designed for orchestration (e.g., Kubernetes, Load Balancers):
- **Liveness** (`GET /api/health/live`): Confirms the FastAPI container is alive and responding to HTTP requests.
- **Readiness** (`GET /api/health/ready`): Confirms that the database is reachable, Ollama is responsive, AND the strictly required `qwen2.5:7b` and `qwen2-vl:7b` models are installed.

## 7. Production Failure Behaviors
- **Ollama/Model Missing**: The backend will stay alive, but agent task requests will safely abort with a `model_unavailable` JSON payload. It will NOT generate fake data.
- **Database Missing**: The application will fail readiness checks and raise 503 Service Unavailable.
- **Agent Task Failures**: If the Agent exceeds retry boundaries due to context size or malformed generation, the state securely marks as `FAILED`. No partial/corrupt reports are saved.

## 8. Backup & Persistence
- **State Data**: All critical agent state and orchestration queues live in the Neon PostgreSQL Database.
- **Models**: Cached inside the `ollama_data` Docker volume.
- **Temporary Uploads**: Held ephemerally inside the container. If long-term archive persistence of uploaded documents is required, mount a host directory to `/app/uploads` and `/app/outputs`.
