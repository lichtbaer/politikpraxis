from fastapi import APIRouter, Query

from app.services.content_service import (
    get_content_bundle,
    load_characters,
    load_events,
    load_laws,
    load_all_scenarios,
)
from app.schemas.content import ContentBundleResponse

router = APIRouter()


@router.get("/bundle", response_model=ContentBundleResponse)
async def bundle(scenario_id: str = Query(default="standard")):
    return get_content_bundle(scenario_id)


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
