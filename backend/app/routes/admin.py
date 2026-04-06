"""Admin-API — Router-Aggregator. Basic-Auth geschützt."""

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import verify_admin
from app.routes import admin_bundesrat, admin_chars, admin_events, admin_gesetze

_ADMIN_RATE_LIMIT = 30  # Anfragen pro Minute
_admin_request_times: dict[str, list[float]] = defaultdict(list)


async def admin_rate_limit(request: Request) -> None:
    """Einfaches Sliding-Window Rate Limit für alle Admin-Endpunkte (30/min pro IP)."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window_start = now - 60.0
    times = _admin_request_times[client_ip]
    times[:] = [t for t in times if t > window_start]
    if len(times) >= _ADMIN_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Admin-Anfragen. Bitte warte eine Minute.",
            headers={"Retry-After": "60"},
        )
    times.append(now)


router = APIRouter(dependencies=[Depends(verify_admin), Depends(admin_rate_limit)])
router.include_router(admin_chars.router)
router.include_router(admin_gesetze.router)
router.include_router(admin_events.router)
router.include_router(admin_bundesrat.router)
