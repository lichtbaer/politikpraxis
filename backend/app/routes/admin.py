"""Admin-API — Router-Aggregator. Basic-Auth geschützt."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import client_ip, verify_admin
from app.routes import admin_bundesrat, admin_chars, admin_events, admin_gesetze
from app.services.admin_rate_limit import check_admin_rate_limit

_audit_logger = logging.getLogger("bundesrepublik.admin.audit")


async def admin_rate_limit(
    request: Request, db: AsyncSession = Depends(get_db)
) -> None:
    """Geteiltes Rate Limit für alle Admin-Endpunkte (30/min pro IP).

    IP über client_ip (X-Real-IP), konsistent mit slowapi hinter nginx. Der
    Zähler liegt in Postgres (app.services.admin_rate_limit) statt In-Memory,
    damit das Limit worker-/instanzübergreifend greift (#231).
    """
    ip = client_ip(request)
    allowed, _count = await check_admin_rate_limit(db, ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Admin-Anfragen. Bitte warte eine Minute.",
            headers={"Retry-After": "60"},
        )


async def admin_audit_log(
    request: Request,
    admin_user: str = Depends(verify_admin),
) -> None:
    """Strukturiertes Audit-Log für alle Admin-Schreiboperationen (POST, PUT, DELETE, PATCH)."""
    if request.method in {"POST", "PUT", "DELETE", "PATCH"}:
        resource = request.url.path.removeprefix("/api/admin")
        _audit_logger.info(
            "ADMIN_WRITE user=%s method=%s path=%s",
            admin_user,
            request.method,
            resource,
        )


router = APIRouter(
    dependencies=[
        Depends(verify_admin),
        Depends(admin_rate_limit),
        Depends(admin_audit_log),
    ]
)
router.include_router(admin_chars.router)
router.include_router(admin_gesetze.router)
router.include_router(admin_events.router)
router.include_router(admin_bundesrat.router)
