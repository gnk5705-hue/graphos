from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./graphos.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    GITHUB_TOKEN: str = ""
    GITHUB_REPO: str = ""

    NOTION_TOKEN: str = ""
    NOTION_PAGE_ID: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
