"""Admin-API — Router-Aggregator. Basic-Auth geschützt."""

import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import client_ip, verify_admin
from app.routes import admin_bundesrat, admin_chars, admin_events, admin_gesetze

_audit_logger = logging.getLogger("bundesrepublik.admin.audit")

_ADMIN_RATE_LIMIT = 30  # Anfragen pro Minute
_ADMIN_WINDOW_SECONDS = 60.0
_CLEANUP_INTERVAL = 300.0  # alle 5 Minuten stale IPs entfernen
_admin_request_times: dict[str, list[float]] = defaultdict(list)
_last_cleanup: float = 0.0


def _cleanup_stale_admin_buckets(now: float) -> None:
    """Entfernt IPs ohne Einträge im aktuellen Fenster (Memory-Leak-Schutz)."""
    global _last_cleanup
    if now - _last_cleanup < _CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    cutoff = now - _ADMIN_WINDOW_SECONDS
    stale_keys = [
        ip for ip, ts in _admin_request_times.items() if not ts or ts[-1] < cutoff
    ]
    for key in stale_keys:
        del _admin_request_times[key]


async def admin_rate_limit(request: Request) -> None:
    """Einfaches Sliding-Window Rate Limit für alle Admin-Endpunkte (30/min pro IP).

    IP über client_ip (X-Real-IP), konsistent mit slowapi hinter nginx.
    """
    ip = client_ip(request)
    now = time.monotonic()
    window_start = now - _ADMIN_WINDOW_SECONDS
    times = _admin_request_times[ip]
    times[:] = [t for t in times if t > window_start]
    if len(times) >= _ADMIN_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Admin-Anfragen. Bitte warte eine Minute.",
            headers={"Retry-After": "60"},
        )
    times.append(now)
    _cleanup_stale_admin_buckets(now)


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
