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
        ]
        for table, col_def in migrations:
            col_name = col_def.split()[0]
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def.split(maxsplit=1)[1]}"))
                conn.commit()
            except Exception:
                pass
