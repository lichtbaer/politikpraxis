"""Admin-API — CRUD für Chars. Basic-Auth geschützt."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale_value
from app.models.content import Char, CharI18n
from app.schemas.admin import CharCreate, CharI18nCreate, CharI18nUpdate, CharUpdate
from app.services.content_db_service import content_cache_clear

router = APIRouter()


@router.get("/chars")
async def admin_list_chars(db: AsyncSession = Depends(get_db)):
    """Liste alle Chars (Basis-Daten ohne i18n)."""
    result = await db.execute(select(Char))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "initials": r.initials,
            "color": r.color,
            "mood_start": r.mood_start,
            "loyalty_start": r.loyalty_start,
            "ultimatum_mood_thresh": r.ultimatum_mood_thresh,
            "ultimatum_event_id": r.ultimatum_event_id,
            "bonus_trigger": r.bonus_trigger,
            "bonus_applies": r.bonus_applies,
            "sonderregel": r.sonderregel,
            "min_complexity": r.min_complexity,
        }
        for r in rows
    ]


@router.post("/chars")
async def admin_create_char(data: CharCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Char).where(Char.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Char '{data.id}' existiert bereits")
    char = Char(
        id=data.id,
        initials=data.initials,
        color=data.color,
        mood_start=data.mood_start,
        loyalty_start=data.loyalty_start,
        ultimatum_mood_thresh=data.ultimatum_mood_thresh,
        ultimatum_event_id=data.ultimatum_event_id,
        bonus_trigger=data.bonus_trigger,
        bonus_applies=data.bonus_applies,
        sonderregel=data.sonderregel,
        min_complexity=data.min_complexity,
    )
    db.add(char)
    await db.flush()
    content_cache_clear()
    return {"id": char.id, "initials": char.initials}


@router.get("/chars/{char_id}")
async def admin_get_char(char_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Char).where(Char.id == char_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(404, detail="Char nicht gefunden")
    return {
        "id": char.id,
        "initials": char.initials,
        "color": char.color,
        "mood_start": char.mood_start,
        "loyalty_start": char.loyalty_start,
        "ultimatum_mood_thresh": char.ultimatum_mood_thresh,
        "ultimatum_event_id": char.ultimatum_event_id,
        "bonus_trigger": char.bonus_trigger,
        "bonus_applies": char.bonus_applies,
        "sonderregel": char.sonderregel,
        "min_complexity": char.min_complexity,
    }


@router.put("/chars/{char_id}")
async def admin_update_char(
    char_id: str, data: CharUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Char).where(Char.id == char_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(404, detail="Char nicht gefunden")
    if data.initials is not None:
        char.initials = data.initials
    if data.color is not None:
        char.color = data.color
    if data.mood_start is not None:
        char.mood_start = data.mood_start
    if data.loyalty_start is not None:
        char.loyalty_start = data.loyalty_start
    if data.ultimatum_mood_thresh is not None:
        char.ultimatum_mood_thresh = data.ultimatum_mood_thresh
    if data.ultimatum_event_id is not None:
        char.ultimatum_event_id = data.ultimatum_event_id
    if data.bonus_trigger is not None:
        char.bonus_trigger = data.bonus_trigger
    if data.bonus_applies is not None:
        char.bonus_applies = data.bonus_applies
    if data.sonderregel is not None:
        char.sonderregel = data.sonderregel
    if data.min_complexity is not None:
        char.min_complexity = data.min_complexity
    content_cache_clear()
    return {"id": char.id}


@router.get("/chars/{char_id}/i18n")
async def admin_list_char_i18n(char_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CharI18n).where(CharI18n.char_id == char_id))
    rows = result.scalars().all()
    return [
        {
            "char_id": r.char_id,
            "locale": r.locale,
            "name": r.name,
            "role": r.role,
            "bio": r.bio,
            "bonus_desc": r.bonus_desc,
            "interests": r.interests or [],
            "keyword": r.keyword,
        }
        for r in rows
    ]


@router.post("/chars/{char_id}/i18n")
async def admin_create_char_i18n(
    char_id: str, data: CharI18nCreate, db: AsyncSession = Depends(get_db)
):
    validate_locale_value(data.locale)
    r = await db.execute(select(Char).where(Char.id == char_id))
    if not r.scalar_one_or_none():
        raise HTTPException(404, detail="Char nicht gefunden")
    i18n = CharI18n(
        char_id=char_id,
        locale=data.locale,
        name=data.name,
        role=data.role,
        bio=data.bio,
        bonus_desc=data.bonus_desc,
        interests=data.interests,
        keyword=data.keyword,
    )
    db.add(i18n)
    await db.flush()
    content_cache_clear()
    return {"char_id": char_id, "locale": data.locale}


@router.put("/chars/{char_id}/i18n/{locale}")
async def admin_update_char_i18n(
    char_id: str,
    locale: str,
    data: CharI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(CharI18n).where(CharI18n.char_id == char_id, CharI18n.locale == locale)
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        i18n = CharI18n(
            char_id=char_id,
            locale=locale,
            name=data.name or "",
            role=data.role or "",
            bio=data.bio or "",
            bonus_desc=data.bonus_desc,
            interests=data.interests or [],
            keyword=data.keyword,
        )
        db.add(i18n)
    else:
        if data.name is not None:
            i18n.name = data.name
        if data.role is not None:
            i18n.role = data.role
        if data.bio is not None:
            i18n.bio = data.bio
        if data.bonus_desc is not None:
            i18n.bonus_desc = data.bonus_desc
        if data.interests is not None:
            i18n.interests = data.interests
        if data.keyword is not None:
            i18n.keyword = data.keyword
    await db.flush()
    content_cache_clear()
    return {"char_id": char_id, "locale": locale}
