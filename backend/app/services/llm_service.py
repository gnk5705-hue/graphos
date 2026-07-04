from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI

OLLAMA_BASE_URL = "http://localhost:11434/v1"
CHAT_MODEL = "llama3.1:8b"

client = AsyncOpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
)

SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are a helpful AI assistant. "
        "CRITICAL RULE: Respond ONLY in English, using only Latin script (a-z, A-Z). "
        "Never use Korean, Chinese, Japanese, or any other script or language, even a single word, "
        "regardless of what language the user writes in. Never mix languages within a response."
    ),
}

# Small local models (e.g. llama3.2:3b) attend more reliably to instructions placed
# near the end of the conversation than to a system message alone, so the rule is
# repeated as a final reminder right before generation.
LANGUAGE_REMINDER = {
    "role": "system",
    "content": "Reminder: reply only in English, Latin script only. Do not use Korean, Chinese, or Japanese characters.",
}


async def chat_stream(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    has_system = any(m.get("role") == "system" for m in messages)
    base_messages = messages if has_system else [SYSTEM_PROMPT] + messages
    all_messages = base_messages + [LANGUAGE_REMINDER]
    stream = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=all_messages,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def chat_complete(messages: List[Dict[str, str]], model: str = CHAT_MODEL) -> str:
    response = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages + [LANGUAGE_REMINDER],
    )
    return response.choices[0].message.content or ""


async def generate_node_summary(node_label: str, messages_content: List[str]) -> str:
    if not messages_content:
        return f"No conversations found related to '{node_label}'."

    combined = "\n---\n".join(messages_content[:20])
    prompt = f"""Summarize, in English, the conversations related to this topic: "{node_label}"

Conversation content:
{combined}

Include the following in your summary:
- Key points discussed
- Conclusions or decisions
- Open questions or unresolved tasks
- Notable insights

Keep it under 300 characters, in bullet point format."""

    return await chat_complete([{"role": "user", "content": prompt}])


async def generate_conversation_title(first_message: str) -> str:
    prompt = f"Create a 3-6 word title in English for this conversation: '{first_message[:200]}'. Return only the title, no quotes."
    return await chat_complete([{"role": "user", "content": prompt}])
