from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI

OLLAMA_BASE_URL = "http://localhost:11434/v1"
CHAT_MODEL = "llama3.2:3b"

client = AsyncOpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
)

SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are a helpful AI assistant. "
        "IMPORTANT: Always respond in the same language the user writes in. "
        "If the user writes in Korean, respond ONLY in Korean. "
        "Never mix languages in a single response. "
        "Do not switch to English, Japanese, Chinese, or any other language mid-sentence."
    ),
}


async def chat_stream(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    has_system = any(m.get("role") == "system" for m in messages)
    all_messages = messages if has_system else [SYSTEM_PROMPT] + messages
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
        messages=messages,
    )
    return response.choices[0].message.content or ""


async def generate_node_summary(node_label: str, messages_content: List[str]) -> str:
    if not messages_content:
        return f"No conversations found related to '{node_label}'."

    combined = "\n---\n".join(messages_content[:20])
    prompt = f"""다음 주제와 관련된 대화를 한국어로 요약해줘: "{node_label}"

대화 내용:
{combined}

다음 항목을 포함해서 간결하게 요약해줘:
- 주요 논의 내용
- 결론 또는 결정사항
- 미해결 질문이나 과제
- 중요한 인사이트

300자 이내로, 불릿 포인트 형식으로."""

    return await chat_complete([{"role": "user", "content": prompt}])


async def generate_conversation_title(first_message: str) -> str:
    prompt = f"다음 대화의 제목을 3~6단어로 만들어줘: '{first_message[:200]}'. 제목만 반환해줘, 따옴표 없이."
    return await chat_complete([{"role": "user", "content": prompt}])
