"""FastAPI-Dependencies (z.B. Admin Basic-Auth, optionale User-Auth, Client-IP, Locale)."""

from uuid import UUID

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBasic,
    HTTPBasicCredentials,
    HTTPBearer,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token
from app.services.content_db_service import VALID_LOCALES

security = HTTPBasic()
optional_bearer = HTTPBearer(auto_error=False)


async def verify_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """Prüft Admin Basic-Auth. Credentials aus ADMIN_USER, ADMIN_PASSWORD."""
    settings = get_settings()
    if not settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin-API nicht konfiguriert (ADMIN_PASSWORD fehlt)",
        )
    import secrets

    user_ok = secrets.compare_digest(
        credentials.username.encode("utf-8"), settings.admin_user.encode("utf-8")
    )
    pass_ok = secrets.compare_digest(
        credentials.password.encode("utf-8"), settings.admin_password.encode("utf-8")
    )
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige Admin-Credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Optionale JWT-Auth: gibt User zurück wenn gültig, sonst None."""
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


def client_ip(request: Request) -> str:
    """Extrahiert Client-IP aus X-Forwarded-For oder request.client."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def validate_locale(locale: str = Query(default="de")) -> str:
    """Validates locale query parameter. Usable as FastAPI dependency."""
    if locale not in VALID_LOCALES:
        allowed = ", ".join(sorted(VALID_LOCALES))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid locale '{locale}'. Allowed: {allowed}",
        )
    return locale


def validate_locale_value(locale: str) -> str:
    """Validates a locale string (direct call, not a query parameter)."""
    if locale not in VALID_LOCALES:
        allowed = ", ".join(sorted(VALID_LOCALES))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid locale '{locale}'. Allowed: {allowed}",
        )
    return locale
