# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GraphOS** — AI 채팅을 실시간 지식 그래프(마인드맵)로 변환하는 앱. 대화를 나누면 자동으로 토픽을 추출해 React Flow 그래프로 시각화한다.

## Running the App

**모든 서버 한번에 시작:**
```powershell
cd "C:\Users\gnk57\OneDrive\Desktop\New Project"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser  # 최초 1회
.\start.ps1
```

**개별 실행:**
```powershell
# 백엔드 (터미널 1) — 반드시 backend 디렉터리에서 실행해야 .env를 찾음
cd "C:\Users\gnk57\OneDrive\Desktop\New Project\backend"
python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드 (터미널 2)
cd "C:\Users\gnk57\OneDrive\Desktop\New Project\frontend"
npm run dev
```

**접속:** http://localhost:5173 | API 문서: http://localhost:8000/docs

## Architecture

```
New Project/
├── backend/          # FastAPI + SQLite + Ollama
│   └── app/
│       ├── main.py           # FastAPI app, CORS, WebSocket /ws, lifespan
│       ├── config.py         # pydantic-settings (.env 로드, extra="ignore")
│       ├── database.py       # SQLite engine, create_tables() + ALTER 마이그레이션
│       ├── models/
│       │   ├── db_models.py  # SQLAlchemy 모델
│       │   └── schemas.py    # Pydantic v2 스키마
│       ├── api/              # 라우터 (chat, graph, nodes, search, timeline, agents, actions, integrations)
│       └── services/
│           ├── llm_service.py        # Ollama 채팅 스트리밍 (llama3.2:3b)
│           ├── extraction_service.py # 토픽 추출 (llama3.2:3b, JSON 파싱)
│           ├── embedding_service.py  # 임베딩 (nomic-embed-text, Ollama REST API)
│           ├── graph_service.py      # 노드/엣지 upsert, WebSocket 브로드캐스트
│           ├── agent_service.py      # AI 에이전트 페르소나 (pm/research/engineer/designer/legal)
│           └── action_service.py     # 문서/코드 생성 SSE 스트리밍
└── frontend/         # React 19 + Vite 8 + TypeScript
    └── src/
        ├── App.tsx           # 최상위 레이아웃, WebSocket 연결, 키보드 단축키
        ├── store/index.ts    # Zustand 전역 상태 (대화, 그래프, 패널 상태)
        ├── api/client.ts     # 모든 API 호출 (SSE fetch + axios)
        ├── types/index.ts    # 공유 TypeScript 타입
        └── components/
            ├── Chat/         # ConversationSidebar, ChatPanel (SSE), ChatMessage, ChatInput
            ├── Graph/        # GraphPanel (React Flow), CustomNode
            ├── NodeDetail/   # NodeDetail (탭: AI요약/Replay/Actions), ActionPanel, ConversationReplay
            ├── Search/       # SearchPanel (⌘K 오버레이, 시맨틱 검색)
            ├── Timeline/     # TimelinePanel
            ├── Agent/        # AgentPanel, CreateAgentModal
            └── Integration/  # IntegrationConfig (GitHub/Notion .env 가이드)
```

## Key Technical Decisions

**LLM: Ollama (로컬, 무료)**
- 채팅/추출/에이전트: `llama3.2:3b` via OpenAI-compatible API (`http://localhost:11434/v1`, `api_key="ollama"`)
- 임베딩: `nomic-embed-text` via Ollama REST API (`POST /api/embeddings`)
- Ollama가 실행 중이어야 하며 두 모델이 pull 되어 있어야 함

**실시간 통신**
- 채팅 응답: SSE (`StreamingResponse`) — `data: {"token": "..."}` 형식
- 그래프 업데이트: WebSocket `/ws` — `{"type": "graph_update", "nodes": [...], "edges": [...]}`
- 에이전트/액션: SSE

**중요한 버그/제약**
- `GraphEdge.relationship` 컬럼명이 SQLAlchemy `relationship()` 함수와 충돌 → DB 컬럼은 `rel_type`, `GraphEdgeSchema.model_validate()`에서 `relationship`으로 매핑
- Pydantic v2: 모델 인스턴스는 불변 → 필드 직접 할당 불가, 생성자 사용
- Tailwind v4: JS config 파일 없음, `@import "tailwindcss"` in CSS + vite plugin
- uvicorn은 반드시 `backend/` 디렉터리에서 실행 (`.env` 경로 문제)
- `config.py`의 `extra = "ignore"` 필수 (`.env`에 불필요한 키가 있어도 허용)

**노드 타입:** `topic | project | task | concept | document | agent`

**그래프 레이아웃:** Zustand store에서 4열 그리드 자동 배치 (220×160px 간격), 드래그 후 위치 유지

## Frontend Build

```powershell
cd "C:\Users\gnk57\OneDrive\Desktop\New Project\frontend"
npm run build   # TypeScript 검사 + Vite 빌드
npm run dev     # 개발 서버 (HMR)
```

## Backend Dependencies

`backend/requirements.txt` 설치:
```powershell
cd "C:\Users\gnk57\OneDrive\Desktop\New Project\backend"
pip install -r requirements.txt
```

## Ollama 모델 설치

```powershell
ollama pull llama3.2:3b       # 채팅/추출 (~2GB)
ollama pull nomic-embed-text  # 시맨틱 검색 (~270MB)
```
