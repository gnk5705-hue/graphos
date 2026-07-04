import uuid
import json
from datetime import datetime
from typing import List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import WebSocket

from app.models.db_models import GraphNode, GraphEdge, MessageNodeLink, Message, Conversation
from app.models.schemas import GraphNodeSchema, GraphEdgeSchema, GraphResponse, NodeDetailResponse, MessageSchema
from app.services.llm_service import generate_node_summary

# Active WebSocket connections
active_connections: Set[WebSocket] = set()


async def connect_ws(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)


def disconnect_ws(websocket: WebSocket):
    active_connections.discard(websocket)


async def broadcast_graph_update(db: Session, conversation_id: Optional[str] = None):
    graph = get_full_graph(db, conversation_id)
    payload = json.dumps({
        "type": "graph_update",
        "conversation_id": conversation_id,
        "nodes": [n.model_dump() for n in graph.nodes],
        "edges": [e.model_dump() for e in graph.edges],
    }, default=str)

    dead = set()
    for ws in active_connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        active_connections.discard(ws)


def _find_node_by_label(db: Session, label: str, conversation_id: Optional[str]) -> Optional[GraphNode]:
    query = db.query(GraphNode).filter(func.lower(GraphNode.label) == label.lower())
    if conversation_id:
        query = query.filter(GraphNode.conversation_id == conversation_id)
    else:
        query = query.filter(GraphNode.conversation_id.is_(None))
    return query.first()


def upsert_node(db: Session, label: str, node_type: str, description: str, conversation_id: Optional[str] = None) -> GraphNode:
    existing = _find_node_by_label(db, label, conversation_id)

    if existing:
        if description and description != existing.description:
            existing.description = description
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
        return existing

    node = GraphNode(
        id=str(uuid.uuid4()),
        label=label,
        node_type=node_type,
        description=description,
        conversation_id=conversation_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


def upsert_edge(db: Session, source_label: str, target_label: str, relationship: str, conversation_id: Optional[str] = None) -> Optional[GraphEdge]:
    source = _find_node_by_label(db, source_label, conversation_id)
    target = _find_node_by_label(db, target_label, conversation_id)

    if not source or not target or source.id == target.id:
        return None

    existing = db.query(GraphEdge).filter(
        GraphEdge.source_id == source.id,
        GraphEdge.target_id == target.id,
    ).first()

    if existing:
        return existing

    edge = GraphEdge(
        id=str(uuid.uuid4()),
        source_id=source.id,
        target_id=target.id,
        rel_type=relationship,
        weight=1.0,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


def link_message_to_nodes(db: Session, message_id: str, node_labels: List[str], conversation_id: Optional[str] = None):
    for label in node_labels:
        node = _find_node_by_label(db, label, conversation_id)
        if not node:
            continue
        existing = db.query(MessageNodeLink).filter(
            MessageNodeLink.message_id == message_id,
            MessageNodeLink.node_id == node.id,
        ).first()
        if not existing:
            link = MessageNodeLink(message_id=message_id, node_id=node.id)
            db.add(link)
    db.commit()


def get_full_graph(db: Session, conversation_id: Optional[str] = None) -> GraphResponse:
    """Nodes scoped to `conversation_id`, plus global nodes (conversation_id
    IS NULL - agents and agent-session topics) which are always visible."""
    query = db.query(GraphNode)
    if conversation_id:
        query = query.filter(or_(GraphNode.conversation_id == conversation_id, GraphNode.conversation_id.is_(None)))
    else:
        query = query.filter(GraphNode.conversation_id.is_(None))
    nodes = query.all()

    node_ids = [n.id for n in nodes]
    edges = (
        db.query(GraphEdge)
        .filter(GraphEdge.source_id.in_(node_ids), GraphEdge.target_id.in_(node_ids))
        .all()
        if node_ids else []
    )
    return GraphResponse(
        nodes=[GraphNodeSchema.model_validate(n) for n in nodes],
        edges=[GraphEdgeSchema.model_validate(e) for e in edges],
    )


async def get_node_detail(db: Session, node_id: str) -> Optional[NodeDetailResponse]:
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node:
        return None

    links = db.query(MessageNodeLink).filter(MessageNodeLink.node_id == node_id).all()
    message_ids = [link.message_id for link in links]

    related_messages = []
    if message_ids:
        related_messages = (
            db.query(Message)
            .filter(Message.id.in_(message_ids))
            .order_by(Message.created_at.desc())
            .limit(10)
            .all()
        )

    messages_content = [f"{m.role}: {m.content}" for m in related_messages]
    summary = await generate_node_summary(node.label, messages_content)

    conversation_excerpts = []
    seen_convs = set()
    for msg in related_messages:
        if msg.conversation_id not in seen_convs:
            seen_convs.add(msg.conversation_id)
            conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
            if conv:
                conversation_excerpts.append({
                    "conversation_id": conv.id,
                    "conversation_title": conv.title,
                    "message_id": msg.id,
                    "excerpt": msg.content[:200],
                    "role": msg.role,
                    "created_at": msg.created_at.isoformat(),
                })

    return NodeDetailResponse(
        node=GraphNodeSchema.model_validate(node),
        summary=summary,
        related_messages=[MessageSchema.model_validate(m) for m in related_messages],
        conversation_excerpts=conversation_excerpts,
    )


def search_graph(db: Session, query: str):
    query_lower = f"%{query.lower()}%"

    nodes = db.query(GraphNode).filter(
        or_(
            func.lower(GraphNode.label).like(query_lower),
            func.lower(GraphNode.description).like(query_lower),
        )
    ).limit(10).all()

    messages = db.query(Message).filter(
        func.lower(Message.content).like(query_lower)
    ).order_by(Message.created_at.desc()).limit(20).all()

    return {
        "nodes": [GraphNodeSchema.model_validate(n) for n in nodes],
        "messages": [MessageSchema.model_validate(m) for m in messages],
    }
