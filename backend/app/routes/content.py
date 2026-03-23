from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.content import (
    BundesratResponse,
    CharResponse,
    ContentBundleResponse,
    EuEventResponse,
    EventResponse,
    GesetzResponse,
    MilieuResponse,
    PolitikfeldResponse,
    VerbandResponse,
)
from app.services.content_db_service import (
    VALID_LOCALES,
    fetch_bundesrat,
    fetch_chars,
    fetch_eu_events,
    fetch_events,
    fetch_gesetz_relationen,
    fetch_gesetze,
    fetch_milieus,
    fetch_politikfelder,
    fetch_verbaende,
    get_game_content_from_db,
)
from app.services.content_service import (
    get_content_bundle,
    load_all_scenarios,
    load_characters,
    load_laws,
)

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


@router.get("/game")
async def game_content(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """Narrative content from DB (chars, laws, events, bundesrat). Use ?locale=en for English."""
    return await get_game_content_from_db(db, locale)


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
    event_type: str | None = Query(
        default=None,
        alias="type",
        description="Filter: random, char_ultimatum, bundesrat",
    ),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_events(db, locale, event_type=event_type)
    return rows


@router.get("/eu-events", response_model=list[EuEventResponse])
async def get_eu_events(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/eu-events?locale=de — EU-Events (Richtlinien, Random, Fix)."""
    rows = await fetch_eu_events(db, locale)
    return rows


@router.get("/bundesrat", response_model=list[BundesratResponse])
async def get_bundesrat(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_bundesrat(db, locale)
    return rows


@router.get("/milieus", response_model=list[MilieuResponse])
async def get_milieus(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/milieus?locale=de — Milieus mit Ideologie."""
    rows = await fetch_milieus(db, locale)
    return rows


@router.get("/politikfelder", response_model=list[PolitikfeldResponse])
async def get_politikfelder(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/politikfelder?locale=de — Politikfelder."""
    rows = await fetch_politikfelder(db, locale)
    return rows


@router.get("/verbaende", response_model=list[VerbandResponse])
async def get_verbaende(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/verbaende?locale=de — Verbände mit Ideologie und Tradeoffs."""
    rows = await fetch_verbaende(db, locale)
    return rows


@router.get("/gesetz-relationen")
async def get_gesetz_relationen(db: AsyncSession = Depends(get_db)):
    """GET /api/content/gesetz-relationen — SMA-312: requires, excludes, enhances."""
    return await fetch_gesetz_relationen(db)
