from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    message_id: str
    conversation_id: str


class MessageSchema(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSchema(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class GraphNodeSchema(BaseModel):
    id: str
    label: str
    node_type: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GraphEdgeSchema(BaseModel):
    id: str
    source_id: str
    target_id: str
    relationship: str
    weight: float

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, 'rel_type'):
            return cls(
                id=str(obj.id),
                source_id=str(obj.source_id),
                target_id=str(obj.target_id),
                relationship=obj.rel_type or 'relates_to',
                weight=float(obj.weight or 1.0),
            )
        return super().model_validate(obj, *args, **kwargs)


class GraphResponse(BaseModel):
    nodes: List[GraphNodeSchema]
    edges: List[GraphEdgeSchema]


class NodeDetailResponse(BaseModel):
    node: GraphNodeSchema
    summary: str
    related_messages: List[MessageSchema]
    conversation_excerpts: List[dict]


class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    nodes: List[GraphNodeSchema]
    messages: List[MessageSchema]
