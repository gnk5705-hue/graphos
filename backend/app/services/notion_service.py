import httpx
from app.config import settings


async def export_to_notion(title: str, content: str) -> str:
    if not settings.NOTION_TOKEN or not settings.NOTION_PAGE_ID:
        raise ValueError("Notion not configured. Set NOTION_TOKEN and NOTION_PAGE_ID in .env")

    chunks = [content[i:i + 2000] for i in range(0, len(content), 2000)]
    children = [
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}]
            },
        }
        for chunk in chunks[:20]
    ]

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.notion.com/v1/pages",
            headers={
                "Authorization": f"Bearer {settings.NOTION_TOKEN}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28",
            },
            json={
                "parent": {"page_id": settings.NOTION_PAGE_ID},
                "properties": {
                    "title": {"title": [{"text": {"content": title[:200]}}]}
                },
                "children": children,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return r.json().get("url", "")


def is_notion_configured() -> bool:
    return bool(settings.NOTION_TOKEN and settings.NOTION_PAGE_ID)
