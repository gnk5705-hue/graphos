import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models.db_models import GraphNode, MessageNodeLink, Message, NodeTypeEnum
from app.models.schemas import GraphNodeSchema
from app.services.action_service import execute_action_stream
from app.services.github_service import create_github_issue, is_github_configured
from app.services.notion_service import export_to_notion, is_notion_configured
from app.services.graph_service import upsert_node, upsert_edge, broadcast_graph_update
from app.services.llm_service import generate_node_summary

router = APIRouter()

STREAMING_ACTIONS = {"generate_prd", "generate_document", "generate_code", "generate_summary"}


class ActionRequest(BaseModel):
    action_type: str
    params: Optional[Dict[str, Any]] = None


def _get_related_content(db: Session, node_id: str) -> str:
    links = db.query(MessageNodeLink).filter(MessageNodeLink.node_id == node_id).all()
    message_ids = [l.message_id for l in links]
    if not message_ids:
        return ""
    messages = db.query(Message).filter(Message.id.in_(message_ids)).order_by(Message.created_at).limit(10).all()
    return "\n".join(f"{m.role}: {m.content}" for m in messages)


@router.post("/nodes/{node_id}/actions")
async def execute_action(node_id: str, req: ActionRequest, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node_label = node.label
    node_description = node.description or ""
    action_type = req.action_type

    # — Non-streaming: create_task —
    if action_type == "create_task":
        params = req.params or {}
        task_title = params.get("title", f"Task: {node_label}")
        task_desc = params.get("description", f"Task created from node: {node_label}")
        task_node = upsert_node(db, task_title, "task", task_desc)
        upsert_edge(db, node_label, task_node.label, "contains")
        await broadcast_graph_update(db)
        return {
            "action": "create_task",
            "node": GraphNodeSchema.model_validate(task_node),
        }

    # — Non-streaming: github_issue —
    if action_type == "github_issue":
        if not is_github_configured():
            raise HTTPException(status_code=400, detail="GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env")
        related = _get_related_content(db, node_id)
        body = f"**Node:** {node_label}\n\n**Description:** {node_description}"
        if related:
            body += f"\n\n**Related discussions:**\n{related[:1500]}"
        try:
            url = await create_github_issue(title=node_label, body=body)
            return {"action": "github_issue", "url": url}
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    # — Non-streaming: notion_export —
    if action_type == "notion_export":
        if not is_notion_configured():
            raise HTTPException(status_code=400, detail="Notion not configured. Set NOTION_TOKEN and NOTION_PAGE_ID in .env")
        related_msgs = _get_related_content(db, node_id)
        summary = await generate_node_summary(node_label, [related_msgs] if related_msgs else [])
        content = f"Description: {node_description}\n\n{summary}"
        try:
            url = await export_to_notion(title=node_label, content=content)
            return {"action": "notion_export", "url": url}
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    # — Streaming: generate_* —
    if action_type not in STREAMING_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action type: {action_type}")

    related_content = _get_related_content(db, node_id)
    full_output = ""
    doc_node_id = str(uuid.uuid4())

    async def generate():
        nonlocal full_output

        yield 'data: {"type": "start"}\n\n'

        async for token in execute_action_stream(action_type, node_label, node_description, related_content):
            full_output += token
            safe = token.replace('"', '\\"').replace('\n', '\\n')
            yield f'data: {{"type": "token", "content": "{safe}"}}\n\n'

        doc_label = f"{node_label} — {action_type.replace('generate_', '').replace('_', ' ').title()}"
        doc_node = upsert_node(db, doc_label, "document", full_output[:300])
        upsert_edge(db, node_label, doc_node.label, "contains")
        await broadcast_graph_update(db)

        node_data = {
            "id": doc_node.id,
            "label": doc_node.label,
            "node_type": str(doc_node.node_type.value) if hasattr(doc_node.node_type, "value") else str(doc_node.node_type),
        }
        import json
        yield f'data: {{"type": "node_created", "node": {json.dumps(node_data)}}}\n\n'
        yield f'data: {{"type": "done", "result": {{"node_id": "{doc_node.id}", "label": "{doc_node.label}"}}}}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
