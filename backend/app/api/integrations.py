from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.github_service import create_github_issue, is_github_configured
from app.services.notion_service import export_to_notion, is_notion_configured

router = APIRouter()


class GithubIssueRequest(BaseModel):
    title: str
    body: str
    labels: list = []


class NotionExportRequest(BaseModel):
    title: str
    content: str


@router.get("/integrations/status")
def integrations_status():
    return {
        "github": is_github_configured(),
        "notion": is_notion_configured(),
    }


@router.post("/integrations/github/issues")
async def github_create_issue(req: GithubIssueRequest):
    if not is_github_configured():
        raise HTTPException(status_code=400, detail="GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env")
    try:
        url = await create_github_issue(req.title, req.body, req.labels)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/integrations/notion/export")
async def notion_export(req: NotionExportRequest):
    if not is_notion_configured():
        raise HTTPException(status_code=400, detail="Notion not configured. Set NOTION_TOKEN and NOTION_PAGE_ID in .env")
    try:
        url = await export_to_notion(req.title, req.content)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
