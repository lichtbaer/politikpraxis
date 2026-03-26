"""Admin-API — Router-Aggregator. Basic-Auth geschützt."""

from fastapi import APIRouter, Depends

from app.dependencies import verify_admin
from app.routes import admin_bundesrat, admin_chars, admin_events, admin_gesetze

router = APIRouter(dependencies=[Depends(verify_admin)])
router.include_router(admin_chars.router)
router.include_router(admin_gesetze.router)
router.include_router(admin_events.router)
router.include_router(admin_bundesrat.router)
