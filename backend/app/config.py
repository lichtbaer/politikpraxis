from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "Bundesrepublik API"
    debug: bool = True

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/bundesrepublik"
    )
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    # Basis-URL des Frontends (Magic-Link Redirect)
    frontend_base_url: str = "http://localhost:5173"
    # Öffentliche API-Basis für E-Mail-Links (ohne trailing slash)
    public_api_base_url: str = "http://localhost:8000/api"

    # Optional: SMTP — Magic-Link; Kontaktformular nutzt dieselben Zugangsdaten
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    mail_from: str = "noreply@localhost"
    # Empfänger für Kontaktformular (getrennt von Absender mail_from)
    contact_recipient: str = ""

    content_dir: str = "app/content"

    # Cookie-Security: explizit steuern (Standard: secure wenn nicht Debug)
    cookie_secure: bool | None = None

    @property
    def effective_cookie_secure(self) -> bool:
        """Secure-Flag: explizit gesetzt oder automatisch basierend auf Debug."""
        if self.cookie_secure is not None:
            return self.cookie_secure
        return not self.debug

    # Admin-API (Basic-Auth)
    admin_user: str = "admin"
    admin_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
