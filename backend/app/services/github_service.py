import httpx
from app.config import settings


async def create_github_issue(title: str, body: str, labels: list = None) -> str:
    if not settings.GITHUB_TOKEN or not settings.GITHUB_REPO:
        raise ValueError("GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://api.github.com/repos/{settings.GITHUB_REPO}/issues",
            headers={
                "Authorization": f"token {settings.GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            json={"title": title, "body": body, "labels": labels or []},
            timeout=15.0,
        )
        r.raise_for_status()
        return r.json()["html_url"]


def is_github_configured() -> bool:
    return bool(settings.GITHUB_TOKEN and settings.GITHUB_REPO)
