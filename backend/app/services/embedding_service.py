import json
import math
from typing import List, Optional
import httpx

OLLAMA_BASE_URL = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"


async def generate_embedding(text: str) -> List[float]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text[:8000]},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()["embedding"]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def embedding_to_str(embedding: List[float]) -> str:
    return json.dumps(embedding)


def str_to_embedding(s: Optional[str]) -> Optional[List[float]]:
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        return None
