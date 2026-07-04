import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Conversation, Message
from app.models.schemas import ChatRequest, ChatResponse
from app.services.llm_service import chat_stream, generate_conversation_title
from app.services.extraction_service import extract_topics
from app.services.graph_service import (
    upsert_node, upsert_edge, link_message_to_nodes, broadcast_graph_update, get_full_graph
)
from app.services.embedding_service import generate_embedding, embedding_to_str

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    conversation_id = request.conversation_id

    if conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation_id = str(uuid.uuid4())
        try:
            title = await generate_conversation_title(request.message)
        except Exception as e:
            print(f"[chat] title generation failed: {e}")
            title = request.message[:50]
        conversation = Conversation(
            id=conversation_id,
            title=title,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()

    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    db.commit()

    history = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

    messages_for_llm = [{"role": m.role, "content": m.content} for m in history]

    full_response = ""

    async def generate():
        nonlocal full_response
        try:
            yield f"data: {{\"conversation_id\": \"{conversation_id}\"}}\n\n"
            async for token in chat_stream(messages_for_llm):
                full_response += token
                safe_token = token.replace('"', '\\"').replace('\n', '\\n')
                yield f"data: {{\"token\": \"{safe_token}\"}}\n\n"
        except Exception as e:
            print(f"[chat] stream error: {e}")
            import traceback; traceback.print_exc()
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
            return

        assistant_msg_id = str(uuid.uuid4())
        assistant_msg = Message(
            id=assistant_msg_id,
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            created_at=datetime.utcnow(),
        )
        db.add(assistant_msg)
        conversation.updated_at = datetime.utcnow()
        db.commit()

        try:
            emb = await generate_embedding(full_response)
            assistant_msg.embedding = embedding_to_str(emb)
            db.commit()
        except Exception:
            pass

        existing_nodes = [n.label for n in get_full_graph(db, conversation_id).nodes]
        extraction = await extract_topics(request.message, full_response, existing_nodes)

        created_node_labels = []
        for node_data in extraction.get("nodes", []):
            node = upsert_node(db, node_data["name"], node_data["type"], node_data["description"], conversation_id=conversation_id)
            created_node_labels.append(node.label)
            try:
                emb = await generate_embedding(f"{node.label}: {node_data.get('description', '')}")
                node.embedding = embedding_to_str(emb)
                db.commit()
            except Exception:
                pass

        for rel in extraction.get("relationships", []):
            upsert_edge(db, rel["source"], rel["target"], rel["relationship"], conversation_id=conversation_id)

        if created_node_labels:
            link_message_to_nodes(db, user_msg.id, created_node_labels, conversation_id=conversation_id)
            link_message_to_nodes(db, assistant_msg_id, created_node_labels, conversation_id=conversation_id)

        await broadcast_graph_update(db, conversation_id)
        yield f"data: {{\"done\": true, \"message_id\": \"{assistant_msg_id}\"}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
