# GraphOS — AI Thinking OS

> Turn your conversations into a living knowledge graph.

GraphOS is an open-source "Thinking OS" that automatically converts AI chat conversations into dynamic mind maps. As you chat, topics are extracted in real-time and visualized as an interactive knowledge graph.

![GraphOS Demo](https://via.placeholder.com/800x450/1a1a2e/60a5fa?text=GraphOS+Demo)

## Features

- **Live Mind Map** — Knowledge graph updates in real-time as you chat
- **Per-Conversation Graphs** — Each conversation gets its own scoped graph, so topics never bleed across unrelated chats
- **Topic Extraction** — AI automatically identifies and connects concepts
- **Semantic Search** — Find anything across all your conversations (⌘K)
- **Timeline View** — Browse your knowledge history over time
- **Conversation Replay** — Revisit how ideas evolved per topic
- **AI Agents** — Specialized agents (PM, Engineer, Researcher, Designer, Legal)
- **Action Layer** — Generate PRDs, documents, code from any node
- **GitHub & Notion Integration** — Export directly to your workflow

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind v4, Zustand |
| Graph | @xyflow/react (React Flow v12) |
| Backend | FastAPI, SQLite, SQLAlchemy |
| AI | Ollama (local) — llama3.1:8b + nomic-embed-text |
| Realtime | SSE (chat streaming) + WebSocket (graph updates) |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

### 1. Pull AI models

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### 2. Clone & install

```bash
git clone https://github.com/gnk5705-hue/graphos.git
cd graphos
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

## Optional Integrations

Add to `backend/.env`:

```env
# GitHub Issues
GITHUB_TOKEN=ghp_your_token
GITHUB_REPO=owner/repository

# Notion Export
NOTION_TOKEN=secret_your_token
NOTION_PAGE_ID=your_page_id
```

## License

AGPL-3.0 — Free to use and self-host. Commercial SaaS use requires a separate license.
