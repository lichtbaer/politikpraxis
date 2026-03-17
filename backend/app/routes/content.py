from fastapi import APIRouter, Depends, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.content_service import (
    get_content_bundle,
    load_characters,
    load_events,
    load_laws,
    load_all_scenarios,
)
from app.services.content_db_service import get_game_content_from_db
from app.schemas.content import ContentBundleResponse

router = APIRouter()


@router.get("/bundle", response_model=ContentBundleResponse)
async def bundle(scenario_id: str = Query(default="standard")):
    return get_content_bundle(scenario_id)


@router.get("/game")
async def game_content(
    locale: str = Query(default="de", description="Locale: de or en"),
    db: AsyncSession = Depends(get_db),
):
    """Narrative content from DB (chars, laws, events, bundesrat). Use ?locale=en for English."""
    return await get_game_content_from_db(db, locale)


@router.get("/characters")
async def characters():
    return load_characters()


@router.get("/events")
async def events():
    return load_events()


@router.get("/laws")
async def laws():
    return load_laws()


@router.get("/scenarios")
async def scenarios():
    return load_all_scenarios()
