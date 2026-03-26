"""Admin-API — CRUD für Events und Event-Choices. Basic-Auth geschützt."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale_value
from app.models.content import Event, EventChoice, EventChoiceI18n, EventI18n
from app.routes.admin_utils import to_float
from app.schemas.admin import (
    EventChoiceCreate,
    EventChoiceI18nUpdate,
    EventCreate,
    EventI18nUpdate,
    EventUpdate,
)
from app.services.content_db_service import content_cache_clear

router = APIRouter()


@router.get("/events")
async def admin_list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "char_id": r.char_id,
            "trigger_type": r.trigger_type,
            "trigger_month": r.trigger_month,
            "repeat_interval": r.repeat_interval,
            "condition_key": r.condition_key,
            "condition_op": r.condition_op,
            "condition_val": r.condition_val,
            "min_complexity": r.min_complexity,
        }
        for r in rows
    ]


@router.post("/events")
async def admin_create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Event).where(Event.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Event '{data.id}' existiert bereits")
    ev = Event(
        id=data.id,
        event_type=data.event_type,
        char_id=data.char_id,
        trigger_type=data.trigger_type,
        trigger_month=data.trigger_month,
        repeat_interval=data.repeat_interval,
        condition_key=data.condition_key,
        condition_op=data.condition_op,
        condition_val=data.condition_val,
        min_complexity=data.min_complexity,
    )
    db.add(ev)
    await db.flush()
    content_cache_clear()
    return {"id": ev.id}


@router.get("/events/{event_id}")
async def admin_get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, detail="Event nicht gefunden")
    return {
        "id": e.id,
        "event_type": e.event_type,
        "char_id": e.char_id,
        "trigger_type": e.trigger_type,
        "trigger_month": e.trigger_month,
        "repeat_interval": e.repeat_interval,
        "condition_key": e.condition_key,
        "condition_op": e.condition_op,
        "condition_val": e.condition_val,
        "min_complexity": e.min_complexity,
    }


@router.put("/events/{event_id}")
async def admin_update_event(
    event_id: str, data: EventUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, detail="Event nicht gefunden")
    if data.event_type is not None:
        e.event_type = data.event_type
    if data.char_id is not None:
        e.char_id = data.char_id
    if data.trigger_type is not None:
        e.trigger_type = data.trigger_type
    if data.trigger_month is not None:
        e.trigger_month = data.trigger_month
    if data.repeat_interval is not None:
        e.repeat_interval = data.repeat_interval
    if data.condition_key is not None:
        e.condition_key = data.condition_key
    if data.condition_op is not None:
        e.condition_op = data.condition_op
    if data.condition_val is not None:
        e.condition_val = data.condition_val
    if data.min_complexity is not None:
        e.min_complexity = data.min_complexity
    content_cache_clear()
    return {"id": e.id}


@router.put("/events/{event_id}/i18n/{locale}")
async def admin_upsert_event_i18n(
    event_id: str,
    locale: str,
    data: EventI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(EventI18n).where(
            EventI18n.event_id == event_id, EventI18n.locale == locale
        )
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        if (
            data.type_label is None
            or data.title is None
            or data.quote is None
            or data.context is None
            or data.ticker is None
        ):
            raise HTTPException(
                400,
                detail="type_label, title, quote, context, ticker erforderlich für neue i18n-Zeile",
            )
        i18n = EventI18n(
            event_id=event_id,
            locale=locale,
            type_label=data.type_label,
            title=data.title,
            quote=data.quote,
            context=data.context,
            ticker=data.ticker,
        )
        db.add(i18n)
    else:
        if data.type_label is not None:
            i18n.type_label = data.type_label
        if data.title is not None:
            i18n.title = data.title
        if data.quote is not None:
            i18n.quote = data.quote
        if data.context is not None:
            i18n.context = data.context
        if data.ticker is not None:
            i18n.ticker = data.ticker
    await db.flush()
    content_cache_clear()
    return {"event_id": event_id, "locale": locale}


@router.get("/events/{event_id}/choices")
async def admin_list_event_choices(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventChoice).where(EventChoice.event_id == event_id)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "choice_key": r.choice_key,
            "choice_type": r.choice_type,
            "cost_pk": r.cost_pk,
            "effekt_al": to_float(r.effekt_al),
            "effekt_hh": to_float(r.effekt_hh),
            "effekt_gi": to_float(r.effekt_gi),
            "effekt_zf": to_float(r.effekt_zf),
            "char_mood": r.char_mood or {},
            "followup_event_id": r.followup_event_id,
        }
        for r in rows
    ]


@router.post("/events/{event_id}/choices")
async def admin_create_event_choice(
    event_id: str, data: EventChoiceCreate, db: AsyncSession = Depends(get_db)
):
    r = await db.execute(select(Event).where(Event.id == event_id))
    if not r.scalar_one_or_none():
        raise HTTPException(404, detail="Event nicht gefunden")
    ch = EventChoice(
        event_id=event_id,
        choice_key=data.choice_key,
        choice_type=data.choice_type,
        cost_pk=data.cost_pk,
        effekt_al=Decimal(str(data.effekt_al)),
        effekt_hh=Decimal(str(data.effekt_hh)),
        effekt_gi=Decimal(str(data.effekt_gi)),
        effekt_zf=Decimal(str(data.effekt_zf)),
        char_mood=data.char_mood,
        loyalty=data.loyalty,
        followup_event_id=data.followup_event_id,
    )
    db.add(ch)
    await db.flush()
    content_cache_clear()
    return {"id": ch.id, "choice_key": ch.choice_key}


@router.put("/events/{event_id}/choices/{choice_id}/i18n/{locale}")
async def admin_upsert_event_choice_i18n(
    event_id: str,
    choice_id: int,
    locale: str,
    data: EventChoiceI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(EventChoice).where(
            EventChoice.id == choice_id, EventChoice.event_id == event_id
        )
    )
    ch = result.scalar_one_or_none()
    if not ch:
        raise HTTPException(404, detail="Event-Choice nicht gefunden")
    r = await db.execute(
        select(EventChoiceI18n).where(
            EventChoiceI18n.choice_id == choice_id,
            EventChoiceI18n.locale == locale,
        )
    )
    i18n = r.scalar_one_or_none()
    if not i18n:
        if data.label is None or data.desc is None or data.log_msg is None:
            raise HTTPException(
                400,
                detail="label, desc, log_msg erforderlich für neue i18n-Zeile",
            )
        i18n = EventChoiceI18n(
            choice_id=choice_id,
            locale=locale,
            label=data.label,
            desc=data.desc,
            log_msg=data.log_msg,
        )
        db.add(i18n)
    else:
        if data.label is not None:
            i18n.label = data.label
        if data.desc is not None:
            i18n.desc = data.desc
        if data.log_msg is not None:
            i18n.log_msg = data.log_msg
    await db.flush()
    content_cache_clear()
    return {"choice_id": choice_id, "locale": locale}
