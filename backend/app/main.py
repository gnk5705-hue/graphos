from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import create_tables
from app.api import chat, graph, nodes, search, timeline, agents, actions, integrations
from app.services.graph_service import connect_ws, disconnect_ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="GraphOS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "GraphOS API", "version": "2.0.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await connect_ws(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        disconnect_ws(websocket)
