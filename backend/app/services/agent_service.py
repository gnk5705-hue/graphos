import json
from typing import List, Dict, AsyncGenerator
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)

AGENT_PERSONAS: Dict[str, Dict[str, str]] = {
    "pm": {
        "name": "PM Agent",
        "description": "Product Manager — creates PRDs, user stories, roadmaps, and prioritization frameworks.",
        "system_prompt": (
            "You are a senior Product Manager with 10+ years of experience at top tech companies. "
            "You excel at writing clear PRDs, defining user stories, creating roadmaps, and prioritizing "
            "features based on business impact. Be concise, structured, and actionable."
        ),
    },
    "research": {
        "name": "Research Agent",
        "description": "Researcher — deep-dives into topics, finds insights, summarizes papers and trends.",
        "system_prompt": (
            "You are a research analyst with expertise in synthesizing complex information. "
            "You excel at literature reviews, competitive analysis, and distilling key insights from large "
            "amounts of information. Be thorough, cite key points, and highlight actionable insights."
        ),
    },
    "engineer": {
        "name": "Engineer Agent",
        "description": "Software Engineer — writes code, reviews architecture, solves technical problems.",
        "system_prompt": (
            "You are a senior software engineer with expertise in full-stack development, system design, "
            "and software architecture. Write clean, well-documented code and explain your technical "
            "decisions clearly. Prioritize maintainability and performance."
        ),
    },
    "designer": {
        "name": "Designer Agent",
        "description": "UX Designer — creates wireframe descriptions, user flows, and design specifications.",
        "system_prompt": (
            "You are a senior UX/UI designer with expertise in user-centered design, accessibility, "
            "and modern design systems. Describe interfaces clearly, create detailed user flows, "
            "and always consider the end user's perspective."
        ),
    },
    "legal": {
        "name": "Legal Agent",
        "description": "Legal Advisor — reviews contracts, identifies risks, explains legal concepts.",
        "system_prompt": (
            "You are a legal advisor with expertise in technology law, contracts, and compliance. "
            "Identify risks, explain legal concepts clearly, and provide practical recommendations. "
            "Always note that your responses are for informational purposes and not formal legal advice."
        ),
    },
    "custom": {
        "name": "Custom Agent",
        "description": "Custom agent with user-defined persona.",
        "system_prompt": "You are a helpful AI assistant.",
    },
}


def get_persona(persona_key: str) -> Dict[str, str]:
    return AGENT_PERSONAS.get(persona_key, AGENT_PERSONAS["custom"])


def build_graph_context(nodes) -> str:
    if not nodes:
        return "No nodes in graph yet."
    lines = [
        f"- {n.label} ({n.node_type.value if hasattr(n.node_type, 'value') else n.node_type}): "
        f"{(n.description or '')[:80]}"
        for n in nodes[:30]
    ]
    return "\n".join(lines)


async def agent_chat_stream(
    messages: List[Dict[str, str]],
    system_prompt: str,
    graph_context: str = "",
) -> AsyncGenerator[str, None]:
    full_system = (
        system_prompt
        + "\n\nCRITICAL RULE: Respond ONLY in English, using only Latin script (a-z, A-Z). "
        "Never use Korean, Chinese, Japanese, or any other script, regardless of what language the user writes in."
    )
    if graph_context:
        full_system += f"\n\nCurrent knowledge graph context:\n{graph_context}"

    language_reminder = {
        "role": "system",
        "content": "Reminder: reply only in English, Latin script only. Do not use Korean, Chinese, or Japanese characters.",
    }
    all_messages = [{"role": "system", "content": full_system}] + messages + [language_reminder]

    stream = await client.chat.completions.create(
        model="llama3.1:8b",
        messages=all_messages,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
