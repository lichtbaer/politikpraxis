from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.database import get_db
from app.schemas.content import (
    CharResponse,
    ContentBundleResponse,
    GesetzResponse,
    EventResponse,
    BundesratResponse,
)
from app.services.content_service import (
    get_content_bundle,
    load_characters,
    load_events,
    load_laws,
    load_all_scenarios,
)
from app.services.content_db_service import (
    VALID_LOCALES,
    fetch_chars,
    fetch_gesetze,
    fetch_events,
    fetch_bundesrat,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def validate_locale(locale: str = Query(default="de")) -> str:
    """Validiert locale; nur 'de' und 'en' erlaubt."""
    if locale not in VALID_LOCALES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige locale '{locale}'. Erlaubt sind: de, en",
        )
    return locale


@router.get("/bundle", response_model=ContentBundleResponse)
async def bundle(scenario_id: str = Query(default="standard")):
    return get_content_bundle(scenario_id)


@router.get("/characters")
async def characters():
    return load_characters()


@router.get("/laws")
async def laws():
    return load_laws()


@router.get("/scenarios")
async def scenarios():
    return load_all_scenarios()


# --- DB-basierte Content-Endpoints (SMA-255) ---


@router.get("/chars", response_model=list[CharResponse])
async def get_chars(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_chars(db, locale)
    return rows


@router.get("/gesetze", response_model=list[GesetzResponse])
async def get_gesetze(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_gesetze(db, locale)
    return rows


@router.get("/events", response_model=list[EventResponse])
async def get_events(
    locale: str = Depends(validate_locale),
    event_type: str | None = Query(default=None, alias="type", description="Filter: random, char_ultimatum, bundesrat"),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_events(db, locale, event_type=event_type)
    return rows


@router.get("/bundesrat", response_model=list[BundesratResponse])
async def get_bundesrat(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_bundesrat(db, locale)
    return rows
