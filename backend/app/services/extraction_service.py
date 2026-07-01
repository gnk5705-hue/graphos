import json
import re
from typing import List, Dict, Any
from openai import AsyncOpenAI

OLLAMA_BASE_URL = "http://localhost:11434/v1"
CHAT_MODEL = "llama3.2:3b"

client = AsyncOpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
)

EXTRACTION_SYSTEM_PROMPT = """You are a knowledge extraction engine. Extract key topics, concepts, projects, and tasks from conversation turns.

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"name": "...", "type": "topic|project|task|concept|document", "description": "..."}
  ],
  "relationships": [
    {"source": "NodeNameA", "target": "NodeNameB", "relationship": "contains|relates_to|part_of|created_by"}
  ]
}

Rules:
- Extract maximum 5 nodes per turn
- node "type" must be one of: topic, project, task, concept, document
- "description" should be 1 sentence max
- Use concise, title-case names for nodes (e.g. "Machine Learning", "Q3 Report")
- Only extract genuinely meaningful concepts, not filler words
- If a concept was likely discussed before, reuse the same name to avoid duplicates
- Return ONLY the JSON object, no other text"""


async def extract_topics(
    user_message: str,
    assistant_response: str,
    existing_node_labels: List[str],
) -> Dict[str, Any]:
    existing_context = ""
    if existing_node_labels:
        existing_context = f"\nExisting nodes in the graph (reuse these names when relevant): {', '.join(existing_node_labels[:50])}"

    user_content = f"""Conversation turn:
USER: {user_message}
ASSISTANT: {assistant_response[:1000]}
{existing_context}

Extract topics from this conversation turn. Return only valid JSON."""

    try:
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
        )
        raw = response.choices[0].message.content or "{}"

        # Extract JSON from response (model may wrap it in markdown)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)

        data = json.loads(raw)
        nodes = data.get("nodes", [])
        relationships = data.get("relationships", [])

        valid_nodes = []
        for node in nodes:
            if isinstance(node, dict) and "name" in node and "type" in node:
                valid_type = node["type"] if node["type"] in ["topic", "project", "task", "concept", "document"] else "topic"
                valid_nodes.append({
                    "name": str(node["name"]).strip(),
                    "type": valid_type,
                    "description": str(node.get("description", "")).strip(),
                })

        valid_relationships = []
        for rel in relationships:
            if isinstance(rel, dict) and "source" in rel and "target" in rel:
                valid_rel = rel.get("relationship", "relates_to")
                if valid_rel not in ["contains", "relates_to", "part_of", "created_by"]:
                    valid_rel = "relates_to"
                valid_relationships.append({
                    "source": str(rel["source"]).strip(),
                    "target": str(rel["target"]).strip(),
                    "relationship": valid_rel,
                })

        return {"nodes": valid_nodes, "relationships": valid_relationships}

    except (json.JSONDecodeError, Exception) as e:
        print(f"[extraction] failed: {e}")
        return {"nodes": [], "relationships": []}
