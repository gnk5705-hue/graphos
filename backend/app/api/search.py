from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.db_models import GraphNode, Message
from app.models.schemas import GraphNodeSchema, MessageSchema
from app.services.embedding_service import generate_embedding, str_to_embedding, cosine_similarity

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10


@router.post("/search")
async def semantic_search(req: SemanticSearchRequest, db: Session = Depends(get_db)):
    try:
        query_emb = await generate_embedding(req.query)
    except Exception:
        query_emb = None

    query_lower = req.query.lower()

    nodes = db.query(GraphNode).all()
    node_scores = []
    for node in nodes:
        emb = str_to_embedding(node.embedding)
        if emb and query_emb:
            score = cosine_similarity(query_emb, emb)
        else:
            score = 0.5 if query_lower in node.label.lower() else (0.3 if query_lower in (node.description or '').lower() else 0.0)
        node_scores.append((score, node))
    node_scores.sort(key=lambda x: x[0], reverse=True)
    top_nodes = [n for s, n in node_scores[: req.limit] if s > 0.25]

    messages = (
        db.query(Message)
        .order_by(Message.created_at.desc())
        .limit(300)
        .all()
    )
    msg_scores = []
    for msg in messages:
        emb = str_to_embedding(msg.embedding)
        if emb and query_emb:
            score = cosine_similarity(query_emb, emb)
        else:
            score = 0.4 if query_lower in msg.content.lower() else 0.0
        msg_scores.append((score, msg))
    msg_scores.sort(key=lambda x: x[0], reverse=True)
    top_msgs = [m for s, m in msg_scores[: req.limit] if s > 0.25]

    return {
        "nodes": [GraphNodeSchema.model_validate(n) for n in top_nodes],
        "messages": [MessageSchema.model_validate(m) for m in top_msgs],
    }
