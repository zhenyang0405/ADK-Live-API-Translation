# Dr. Lingua

Real-time AI research translation agent (Phase 0 Scaffold).

## Architecture
- `frontend/`: Next.js App Router (React) on port 3000
- `backend/api/`: Python FastAPI REST API on port 8001
- `backend/streaming/`: Python FastAPI WebSocket streaming service on port 8002

## Prerequisites
- Node.js 20+
- Python 3.12+
- Firebase project
- Google Cloud CLI (`gcloud auth application-default login`)

## Setup

1. Copy environment files and fill them in:
   - `frontend/.env.local.example` -> `frontend/.env.local`
   - `backend/.env.example` -> `backend/.env`

2. Run Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Run Backend (Local):
   ```bash
   cd backend
   pip install -r api/requirements.txt -r streaming/requirements.txt
   PYTHONPATH=. uvicorn api.app.main:app --port 8001 --reload
   PYTHONPATH=. uvicorn streaming.app.main:app --port 8002 --reload
   ```

4. Run Backend (Docker):
   ```bash
   cd backend
   docker compose up --build
   ```
