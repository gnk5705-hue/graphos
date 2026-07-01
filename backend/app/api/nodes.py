from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Conversation, GraphNode, Message, MessageNodeLink
from app.models.schemas import ConversationSchema, MessageSchema, NodeDetailResponse
from app.services.graph_service import get_node_detail

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationSchema])
def list_conversations(db: Session = Depends(get_db)):
    conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    result = []
    for conv in conversations:
        count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        schema = ConversationSchema(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=count,
        )
        result.append(schema)
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageSchema])
def get_messages(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    return [MessageSchema.model_validate(m) for m in messages]


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    db.commit()
    return {"status": "deleted"}


@router.get("/nodes/{node_id}/replay")
def conversation_replay(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    links = db.query(MessageNodeLink).filter(MessageNodeLink.node_id == node_id).all()
    message_ids = [lnk.message_id for lnk in links]

    if not message_ids:
        node_type = node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type)
        return {"node_label": node.label, "node_type": node_type, "threads": []}

    messages = (
        db.query(Message)
        .filter(Message.id.in_(message_ids))
        .order_by(Message.created_at)
        .all()
    )

    conv_messages: dict = defaultdict(list)
    for msg in messages:
        conv_messages[msg.conversation_id].append(msg)

    threads = []
    for conv_id, msgs in conv_messages.items():
        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
        threads.append({
            "conversation_id": conv_id,
            "conversation_title": conv.title if conv else "Unknown",
            "messages": [MessageSchema.model_validate(m) for m in msgs],
        })

    threads.sort(key=lambda t: t["messages"][0].created_at if t["messages"] else "")

    node_type = node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type)
    return {"node_label": node.label, "node_type": node_type, "threads": threads}


@router.get("/nodes/{node_id}", response_model=NodeDetailResponse)
async def get_node(node_id: str, db: Session = Depends(get_db)):
    detail = await get_node_detail(db, node_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Node not found")
    return detail
