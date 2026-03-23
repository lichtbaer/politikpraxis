"""FastAPI-Dependencies (z.B. Admin Basic-Auth)."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import get_settings

security = HTTPBasic()


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
