from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import GraphEdge, GraphNode, MessageNodeLink
from app.models.schemas import GraphEdgeSchema, GraphResponse, SearchRequest, SearchResponse
from app.services.graph_service import get_full_graph, search_graph

router = APIRouter()


@router.get("/graph", response_model=GraphResponse)
def get_graph(conversation_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_full_graph(db, conversation_id)


@router.post("/graph/search", response_model=SearchResponse)
def search(request: SearchRequest, db: Session = Depends(get_db)):
    results = search_graph(db, request.query)
    return SearchResponse(**results)


@router.get("/graph/memory")
def get_memory_graph(db: Session = Depends(get_db)):
    nodes = db.query(GraphNode).order_by(GraphNode.created_at).all()
    edges = db.query(GraphEdge).all()
    now = datetime.utcnow()

    node_data = []
    for node in nodes:
        age_days = (now - node.created_at).days if node.created_at else 0
        link_count = db.query(MessageNodeLink).filter(MessageNodeLink.node_id == node.id).count()
        node_type = node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type)
        node_data.append({
            "id": node.id,
            "label": node.label,
            "node_type": node_type,
            "description": node.description,
            "created_at": node.created_at.isoformat() if node.created_at else None,
            "updated_at": node.updated_at.isoformat() if node.updated_at else None,
            "age_days": age_days,
            "connection_count": link_count,
        })

    edge_data = [GraphEdgeSchema.model_validate(e) for e in edges]

    return {
        "nodes": node_data,
        "edges": [e.model_dump() for e in edge_data],
        "generated_at": now.isoformat(),
    }
