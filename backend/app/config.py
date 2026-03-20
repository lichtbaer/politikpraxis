from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Bundesrepublik API"
    debug: bool = True

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bundesrepublik"
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    content_dir: str = "app/content"

    # Admin-API (Basic-Auth)
    admin_user: str = "admin"
    admin_password: str = ""

    # Kontaktformular (SMTP, nur in .env setzen — nie im Code)
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    contact_recipient: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
