from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale
from app.schemas.content import (
    BundeslandResponse,
    BundesratResponse,
    CharResponse,
    ContentBundleResponse,
    EuEventResponse,
    EventResponse,
    GesetzResponse,
    MedienAkteurResponse,
    MilieuResponse,
    PolitikfeldResponse,
    VerbandResponse,
)
from app.services.content_db_service import (
    fetch_agenda_ziele,
    fetch_bundeslaender,
    fetch_bundesrat,
    fetch_chars,
    fetch_eu_events,
    fetch_events,
    fetch_gesetz_relationen,
    fetch_gesetze,
    fetch_koalitions_ziele,
    fetch_medien_akteure,
    fetch_milieus,
    fetch_politikfelder,
    fetch_verbaende,
    get_game_content_from_db,
)
from app.services.content_service import (
    get_content_bundle_from_db,
    load_all_scenarios,
    load_characters,
)

router = APIRouter()


@router.get("/bundle", response_model=ContentBundleResponse)
async def bundle(
    scenario_id: str = Query(default="standard"),
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """Legacy-Bundle: Gesetze kommen aus der DB (Single Source of Truth)."""
    return await get_content_bundle_from_db(db, locale, scenario_id)


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


@router.get("/laws", response_model=list[GesetzResponse], deprecated=True)
async def laws(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """Deprecated: nutze GET /content/gesetze."""
    return await fetch_gesetze(db, locale)


@router.get("/scenarios")
async def scenarios():
    return load_all_scenarios()


# --- DB-basierte Content-Endpoints (SMA-255) ---


@router.get("/chars", response_model=list[CharResponse])
async def get_chars(
    locale: str = Depends(validate_locale),
    complexity: int | None = Query(
        default=None,
        ge=1,
        le=4,
        description="Filtert Chars auf min_complexity <= complexity",
    ),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_chars(db, locale)
    if complexity is not None:
        rows = [r for r in rows if (r.get("min_complexity") or 1) <= complexity]
    return rows


@router.get("/gesetze", response_model=list[GesetzResponse])
async def get_gesetze(
    locale: str = Depends(validate_locale),
    complexity: int | None = Query(
        default=None,
        ge=1,
        le=4,
        description="Filtert Gesetze auf min_complexity <= complexity",
    ),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_gesetze(db, locale)
    if complexity is not None:
        rows = [r for r in rows if (r.get("min_complexity") or 1) <= complexity]
    return rows


@router.get("/events", response_model=list[EventResponse])
async def get_events(
    locale: str = Depends(validate_locale),
    event_type: str | None = Query(
        default=None,
        alias="type",
        description="Filter: random, char_ultimatum, bundesrat",
    ),
    complexity: int | None = Query(
        default=None,
        ge=1,
        le=4,
        description="Filtert Events auf min_complexity <= complexity",
    ),
    db: AsyncSession = Depends(get_db),
):
    rows = await fetch_events(db, locale, event_type=event_type)
    if complexity is not None:
        rows = [r for r in rows if (r.get("min_complexity") or 1) <= complexity]
    return rows


@router.get("/eu-events", response_model=list[EuEventResponse])
async def get_eu_events(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/eu-events?locale=de — EU-Events (Richtlinien, Random, Fix)."""
    rows = await fetch_eu_events(db, locale)
    return rows


@router.get("/bundeslaender", response_model=list[BundeslandResponse])
async def get_bundeslaender(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/bundeslaender?locale=de — 16 Bundesländer mit lokalisiertem Namen."""
    return await fetch_bundeslaender(db, locale)


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


@router.get("/medien-akteure", response_model=list[MedienAkteurResponse])
async def get_medien_akteure(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/medien-akteure?locale=de — Medienakteure mit lokalisiertem Namen."""
    return await fetch_medien_akteure(db, locale)


@router.get("/gesetz-relationen")
async def get_gesetz_relationen(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/gesetz-relationen?locale=de — SMA-312: requires, excludes, enhances."""
    return await fetch_gesetz_relationen(db, locale)


@router.get("/agenda-ziele")
async def get_agenda_ziele(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/agenda-ziele — Spieler-Agenda-Ziele (SMA-501)."""
    return await fetch_agenda_ziele(db, locale)


@router.get("/koalitions-ziele")
async def get_koalitions_ziele(
    locale: str = Depends(validate_locale),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/content/koalitions-ziele — Koalitionspartner-Ziele (SMA-501)."""
    return await fetch_koalitions_ziele(db, locale)
