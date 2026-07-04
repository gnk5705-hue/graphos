from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.models.db_models import (  # noqa
        Conversation, Message, GraphNode, GraphEdge, MessageNodeLink, AgentSession
    )
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        migrations = [
            ("messages", "embedding TEXT"),
            ("graph_nodes", "embedding TEXT"),
            ("graph_nodes", "agent_persona TEXT"),
            ("graph_nodes", "conversation_id VARCHAR"),
        ]
        for table, col_def in migrations:
            col_name = col_def.split()[0]
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def.split(maxsplit=1)[1]}"))
                conn.commit()
            except Exception:
                pass

        # Older DBs have a UNIQUE(label) constraint on graph_nodes, which
        # blocks the same topic name from existing in two conversations.
        # Rebuild the table without it (existing rows are kept, becoming
        # "global" nodes since they predate per-conversation scoping).
        row = conn.execute(text(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='graph_nodes'"
        )).fetchone()
        if row and row[0] and "UNIQUE" in row[0]:
            conn.execute(text("ALTER TABLE graph_nodes RENAME TO graph_nodes_old"))
            conn.commit()
            GraphNode.__table__.create(bind=engine)
            conn.execute(text(
                "INSERT INTO graph_nodes "
                "(id, label, node_type, description, embedding, agent_persona, conversation_id, created_at, updated_at) "
                "SELECT id, label, node_type, description, embedding, agent_persona, conversation_id, created_at, updated_at "
                "FROM graph_nodes_old"
            ))
            conn.commit()
            conn.execute(text("DROP TABLE graph_nodes_old"))
            conn.commit()

        # The rename above kept pre-scoping rows as "global" (conversation_id
        # NULL), which made every conversation's mind map show unrelated old
        # topics. Real global nodes are agents and their session-extracted
        # topics (linked to an agent via a "created_by" edge); anything else
        # with no conversation, no message link, and no agent link is debris
        # from before per-conversation scoping existed - remove it.
        orphan_ids = [
            row[0] for row in conn.execute(text("""
                SELECT id FROM graph_nodes
                WHERE conversation_id IS NULL
                  AND node_type != 'agent'
                  AND id NOT IN (SELECT node_id FROM message_node_links)
                  AND id NOT IN (
                      SELECT ge.source_id FROM graph_edges ge
                      JOIN graph_nodes gn ON gn.id = ge.target_id AND gn.node_type = 'agent'
                      UNION
                      SELECT ge.target_id FROM graph_edges ge
                      JOIN graph_nodes gn ON gn.id = ge.source_id AND gn.node_type = 'agent'
                  )
            """)).fetchall()
        ]
        for node_id in orphan_ids:
            conn.execute(text("DELETE FROM graph_edges WHERE source_id = :id OR target_id = :id"), {"id": node_id})
            conn.execute(text("DELETE FROM graph_nodes WHERE id = :id"), {"id": node_id})
        if orphan_ids:
            conn.commit()
