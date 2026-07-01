from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Conversation, GraphNode, Message

router = APIRouter()


@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db), days: int = Query(default=30, le=365)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    events = []

    nodes = (
        db.query(GraphNode)
        .filter(GraphNode.created_at >= cutoff)
        .order_by(GraphNode.created_at)
        .all()
    )
    for node in nodes:
        node_type = node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type)
        events.append({
            "type": "node_created",
            "date": node.created_at.isoformat(),
            "data": {
                "id": node.id,
                "label": node.label,
                "node_type": node_type,
                "description": node.description,
            },
        })

    convs = (
        db.query(Conversation)
        .filter(Conversation.created_at >= cutoff)
        .order_by(Conversation.created_at)
        .all()
    )
    for conv in convs:
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        events.append({
            "type": "conversation_started",
            "date": conv.created_at.isoformat(),
            "data": {
                "id": conv.id,
                "title": conv.title,
                "message_count": msg_count,
            },
        })

    events.sort(key=lambda e: e["date"])

    grouped: dict = defaultdict(list)
    for event in events:
        day = event["date"][:10]
        grouped[day].append(event)

    total_nodes = db.query(GraphNode).count()
    total_convs = db.query(Conversation).count()

    return {
        "events": events,
        "grouped": [{"date": k, "events": v} for k, v in sorted(grouped.items())],
        "stats": {
            "total_nodes": total_nodes,
            "total_conversations": total_convs,
            "period_days": days,
        },
    }
