from typing import AsyncGenerator
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)

ACTION_PROMPTS = {
    "generate_prd": """\
You are a senior Product Manager. Generate a comprehensive Product Requirements Document (PRD).

Structure your response exactly as:
# {label} — PRD

## Overview
## Problem Statement
## Goals & Success Metrics
## User Stories
## Functional Requirements
## Non-Functional Requirements
## Out of Scope
## Timeline

Topic: {label}
Context: {context}

Write a detailed, actionable PRD.""",

    "generate_document": """\
Generate a comprehensive, well-structured document about the following topic.
Include key concepts, important details, and actionable insights.

Topic: {label}
Context: {context}""",

    "generate_code": """\
You are a senior software engineer. Generate production-ready code for the following.
Include proper error handling, comments, and a brief explanation of the approach.

Topic: {label}
Context: {context}""",

    "generate_summary": """\
Create a detailed executive summary for the following topic.
Include key points, decisions made, and next steps.

Topic: {label}
Context: {context}""",
}


async def execute_action_stream(
    action_type: str,
    node_label: str,
    node_description: str,
    related_messages_content: str,
) -> AsyncGenerator[str, None]:
    prompt_template = ACTION_PROMPTS.get(action_type, ACTION_PROMPTS["generate_document"])
    if related_messages_content:
        context = f"{node_description}\n\nRelated discussions:\n{related_messages_content[:2000]}"
    else:
        context = node_description or "No additional context available."

    prompt = prompt_template.format(label=node_label, context=context)
    prompt += (
        "\n\nCRITICAL RULE: Write your entire response in English only, using Latin script (a-z, A-Z). "
        "Do not use Korean, Chinese, Japanese, or any other script, regardless of the language used above."
    )

    stream = await client.chat.completions.create(
        model="llama3.1:8b",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
