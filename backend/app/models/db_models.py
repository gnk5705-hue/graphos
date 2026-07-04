import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class RoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class NodeTypeEnum(str, enum.Enum):
    topic = "topic"
    project = "project"
    task = "task"
    concept = "concept"
    document = "document"
    agent = "agent"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    graph_nodes = relationship("GraphNode", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    node_links = relationship("MessageNodeLink", back_populates="message", cascade="all, delete-orphan")


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Nodes belong to the conversation that produced them, so different
    # conversations never merge into one shared mind map. NULL means the
    # node is "global" (agents and agent-session topics) and always visible.
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True)
    label = Column(String, nullable=False)
    node_type = Column(SAEnum(NodeTypeEnum), nullable=False, default=NodeTypeEnum.topic)
    description = Column(Text, default="")
    embedding = Column(Text, nullable=True)
    agent_persona = Column(Text, nullable=True)  # JSON: {persona_key, system_prompt, name}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="graph_nodes")
    source_edges = relationship("GraphEdge", foreign_keys="GraphEdge.source_id", back_populates="source", cascade="all, delete-orphan")
    target_edges = relationship("GraphEdge", foreign_keys="GraphEdge.target_id", back_populates="target", cascade="all, delete-orphan")
    message_links = relationship("MessageNodeLink", back_populates="node", cascade="all, delete-orphan")
    agent_sessions = relationship("AgentSession", back_populates="agent_node", cascade="all, delete-orphan")


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False)
    rel_type = Column(String, nullable=False, default="relates_to")
    weight = Column(Float, default=1.0)

    source = relationship("GraphNode", foreign_keys="GraphEdge.source_id", back_populates="source_edges")
    target = relationship("GraphNode", foreign_keys="GraphEdge.target_id", back_populates="target_edges")


class MessageNodeLink(Base):
    __tablename__ = "message_node_links"

    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True)
    node_id = Column(String, ForeignKey("graph_nodes.id", ondelete="CASCADE"), primary_key=True)

    message = relationship("Message", back_populates="node_links")
    node = relationship("GraphNode", back_populates="message_links")


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_node_id = Column(String, ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, default="Agent Session")
    messages_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    agent_node = relationship("GraphNode", back_populates="agent_sessions")
