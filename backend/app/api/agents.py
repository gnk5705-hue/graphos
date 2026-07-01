import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.db_models import GraphNode, AgentSession, NodeTypeEnum
from app.models.schemas import GraphNodeSchema
from app.services.agent_service import AGENT_PERSONAS, get_persona, agent_chat_stream, build_graph_context
from app.services.extraction_service import extract_topics
from app.services.graph_service import upsert_node, upsert_edge, link_message_to_nodes, broadcast_graph_update, get_full_graph
from sqlalchemy import func

router = APIRouter()


class CreateAgentRequest(BaseModel):
    persona_key: str = "custom"
    custom_name: Optional[str] = None
    custom_system_prompt: Optional[str] = None


class CreateSessionRequest(BaseModel):
    title: str = "New Session"


class AgentChatRequest(BaseModel):
    message: str


@router.get("/agents/personas")
def list_personas():
    return [
        {"key": k, "name": v["name"], "description": v["description"]}
        for k, v in AGENT_PERSONAS.items()
    ]


@router.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    agents = db.query(GraphNode).filter(GraphNode.node_type == NodeTypeEnum.agent).all()
    result = []
    for a in agents:
        persona = {}
        if a.agent_persona:
            try:
                persona = json.loads(a.agent_persona)
            except Exception:
                pass
        result.append({
            "id": a.id,
            "label": a.label,
            "description": a.description,
            "persona": persona,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return result


@router.post("/agents")
async def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):
    persona = get_persona(req.persona_key)

    name = req.custom_name or persona["name"]
    system_prompt = req.custom_system_prompt or persona["system_prompt"]
    description = persona["description"]

    persona_data = {
        "persona_key": req.persona_key,
        "name": name,
        "system_prompt": system_prompt,
    }

    existing = db.query(GraphNode).filter(
        func.lower(GraphNode.label) == name.lower()
    ).first()

    if existing:
        existing.agent_persona = json.dumps(persona_data)
        existing.node_type = NodeTypeEnum.agent
        db.commit()
        db.refresh(existing)
        node = existing
    else:
        node = GraphNode(
            id=str(uuid.uuid4()),
            label=name,
            node_type=NodeTypeEnum.agent,
            description=description,
            agent_persona=json.dumps(persona_data),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(node)
        db.commit()
        db.refresh(node)

    await broadcast_graph_update(db)

    return {
        "id": node.id,
        "label": node.label,
        "description": node.description,
        "persona": persona_data,
    }


@router.get("/agents/{node_id}/sessions")
def list_sessions(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node or node.node_type != NodeTypeEnum.agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    sessions = db.query(AgentSession).filter(
        AgentSession.agent_node_id == node_id
    ).order_by(AgentSession.updated_at.desc()).all()

    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(json.loads(s.messages_json or "[]")),
        }
        for s in sessions
    ]


@router.post("/agents/{node_id}/sessions")
def create_session(node_id: str, req: CreateSessionRequest, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node or node.node_type != NodeTypeEnum.agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session = AgentSession(
        id=str(uuid.uuid4()),
        agent_node_id=node_id,
        title=req.title,
        messages_json="[]",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "title": session.title,
        "agent_node_id": node_id,
        "created_at": session.created_at.isoformat(),
    }


@router.post("/agents/{node_id}/sessions/{session_id}/chat")
async def agent_chat(
    node_id: str,
    session_id: str,
    req: AgentChatRequest,
    db: Session = Depends(get_db),
):
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node or node.node_type != NodeTypeEnum.agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session = db.query(AgentSession).filter(
        AgentSession.id == session_id,
        AgentSession.agent_node_id == node_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    persona_data = {}
    if node.agent_persona:
        try:
            persona_data = json.loads(node.agent_persona)
        except Exception:
            pass

    system_prompt = persona_data.get("system_prompt", "You are a helpful AI assistant.")

    prior_messages = json.loads(session.messages_json or "[]")
    prior_messages.append({"role": "user", "content": req.message})

    all_nodes = db.query(GraphNode).all()
    graph_context = build_graph_context(all_nodes)

    full_response = ""
    message_id = str(uuid.uuid4())

    async def generate():
        nonlocal full_response

        yield f"data: {{\"conversation_id\": \"{session_id}\"}}\n\n"

        async for token in agent_chat_stream(prior_messages, system_prompt, graph_context):
            full_response += token
            safe = token.replace('"', '\\"').replace('\n', '\\n')
            yield f"data: {{\"token\": \"{safe}\"}}\n\n"

        prior_messages.append({"role": "assistant", "content": full_response})
        session.messages_json = json.dumps(prior_messages)
        session.updated_at = datetime.utcnow()
        db.commit()

        existing_labels = [n.label for n in get_full_graph(db).nodes]
        extraction = await extract_topics(req.message, full_response, existing_labels)

        created_labels = []
        for nd in extraction.get("nodes", []):
            n = upsert_node(db, nd["name"], nd["type"], nd["description"])
            created_labels.append(n.label)
            upsert_edge(db, node.label, n.label, "created_by")

        for rel in extraction.get("relationships", []):
            upsert_edge(db, rel["source"], rel["target"], rel["relationship"])

        await broadcast_graph_update(db)

        yield f"data: {{\"done\": true, \"message_id\": \"{message_id}\"}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/agents/{node_id}/sessions/{session_id}/messages")
def get_session_messages(node_id: str, session_id: str, db: Session = Depends(get_db)):
    session = db.query(AgentSession).filter(
        AgentSession.id == session_id,
        AgentSession.agent_node_id == node_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = json.loads(session.messages_json or "[]")
    return {"session_id": session_id, "messages": messages}
