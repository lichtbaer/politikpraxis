import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "Bundesrepublik API"
    debug: bool = False

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
    s = Settings()
    if not s.debug:
        problems: list[str] = []
        if s.secret_key == "dev-secret-change-in-production":
            problems.append(
                "SECRET_KEY ist noch der Standardwert — "
                "generiere einen sicheren Wert mit: openssl rand -hex 32"
            )
        if len(s.secret_key) < 64:
            problems.append(
                "SECRET_KEY ist zu kurz (< 64 Zeichen / 256 bit für HS256) — "
                "generiere einen sicheren Wert mit: openssl rand -hex 32"
            )
        if not s.admin_password:
            problems.append(
                "ADMIN_PASSWORD ist nicht gesetzt — "
                "setze ein starkes Passwort für die Admin-API"
            )
        if any("localhost" in o or "127.0.0.1" in o for o in s.cors_origins):
            problems.append(
                "CORS_ORIGINS enthält localhost/127.0.0.1 — "
                "setze CORS_ORIGINS auf die tatsächliche Produktions-URL"
            )
        if problems:
            raise ValueError(
                "Unsichere Produktionskonfiguration — Server wird nicht gestartet:\n"
                + "\n".join(f"  - {p}" for p in problems)
            )
        if not s.smtp_host:
            _logger.warning(
                "SMTP_HOST nicht konfiguriert — Magic Links und Kontaktformular "
                "geben zur Laufzeit HTTP 503 zurück"
            )
    return s
