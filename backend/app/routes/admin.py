"""Admin-API — CRUD für Chars, Gesetze, Events, Bundesrat. Basic-Auth geschützt."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import verify_admin
from app.models.content import (
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
    Char,
    CharI18n,
    Event,
    EventChoice,
    EventChoiceI18n,
    EventI18n,
    Gesetz,
    GesetzI18n,
)
from app.schemas.admin import (
    BundesratFraktionCreate,
    BundesratFraktionI18nUpdate,
    BundesratTradeoffCreate,
    BundesratTradeoffI18nUpdate,
    CharCreate,
    CharI18nCreate,
    CharI18nUpdate,
    CharUpdate,
    EventChoiceCreate,
    EventChoiceI18nUpdate,
    EventCreate,
    EventI18nUpdate,
    EventUpdate,
    GesetzCreate,
    GesetzI18nUpdate,
    GesetzUpdate,
)
from app.services.content_db_service import VALID_LOCALES, content_cache_clear

router = APIRouter(dependencies=[Depends(verify_admin)])


def _validate_locale(locale: str) -> str:
    if locale not in VALID_LOCALES:
        raise HTTPException(400, detail=f"Ungültige locale '{locale}'. Erlaubt: de, en")
    return locale


def _to_float(v: Decimal | float | None) -> float:
    return float(v) if v is not None else 0.0


# --- Chars ---


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
    _validate_locale(data.locale)
    # Prüfen ob Char existiert
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
    _validate_locale(locale)
    result = await db.execute(
        select(CharI18n).where(CharI18n.char_id == char_id, CharI18n.locale == locale)
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        # Upsert: Insert wenn nicht vorhanden
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


# --- Gesetze ---


@router.get("/gesetze")
async def admin_list_gesetze(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gesetz))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "tags": r.tags or [],
            "bt_stimmen_ja": r.bt_stimmen_ja,
            "effekt_al": _to_float(r.effekt_al),
            "effekt_hh": _to_float(r.effekt_hh),
            "effekt_gi": _to_float(r.effekt_gi),
            "effekt_zf": _to_float(r.effekt_zf),
            "effekt_lag": r.effekt_lag,
            "foederalismus_freundlich": r.foederalismus_freundlich,
        }
        for r in rows
    ]


@router.post("/gesetze")
async def admin_create_gesetz(data: GesetzCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Gesetz).where(Gesetz.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Gesetz '{data.id}' existiert bereits")
    gesetz = Gesetz(
        id=data.id,
        tags=data.tags,
        bt_stimmen_ja=data.bt_stimmen_ja,
        effekt_al=Decimal(str(data.effekt_al)),
        effekt_hh=Decimal(str(data.effekt_hh)),
        effekt_gi=Decimal(str(data.effekt_gi)),
        effekt_zf=Decimal(str(data.effekt_zf)),
        effekt_lag=data.effekt_lag,
        foederalismus_freundlich=data.foederalismus_freundlich,
    )
    db.add(gesetz)
    await db.flush()
    content_cache_clear()
    return {"id": gesetz.id}


@router.get("/gesetze/{gesetz_id}")
async def admin_get_gesetz(gesetz_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gesetz).where(Gesetz.id == gesetz_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, detail="Gesetz nicht gefunden")
    return {
        "id": g.id,
        "tags": g.tags or [],
        "bt_stimmen_ja": g.bt_stimmen_ja,
        "effekt_al": _to_float(g.effekt_al),
        "effekt_hh": _to_float(g.effekt_hh),
        "effekt_gi": _to_float(g.effekt_gi),
        "effekt_zf": _to_float(g.effekt_zf),
        "effekt_lag": g.effekt_lag,
        "foederalismus_freundlich": g.foederalismus_freundlich,
    }


@router.put("/gesetze/{gesetz_id}")
async def admin_update_gesetz(
    gesetz_id: str, data: GesetzUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gesetz).where(Gesetz.id == gesetz_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, detail="Gesetz nicht gefunden")
    if data.tags is not None:
        g.tags = data.tags
    if data.bt_stimmen_ja is not None:
        g.bt_stimmen_ja = data.bt_stimmen_ja
    if data.effekt_al is not None:
        g.effekt_al = Decimal(str(data.effekt_al))
    if data.effekt_hh is not None:
        g.effekt_hh = Decimal(str(data.effekt_hh))
    if data.effekt_gi is not None:
        g.effekt_gi = Decimal(str(data.effekt_gi))
    if data.effekt_zf is not None:
        g.effekt_zf = Decimal(str(data.effekt_zf))
    if data.effekt_lag is not None:
        g.effekt_lag = data.effekt_lag
    if data.foederalismus_freundlich is not None:
        g.foederalismus_freundlich = data.foederalismus_freundlich
    content_cache_clear()
    return {"id": g.id}


@router.put("/gesetze/{gesetz_id}/i18n/{locale}")
async def admin_upsert_gesetz_i18n(
    gesetz_id: str,
    locale: str,
    data: GesetzI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    _validate_locale(locale)
    result = await db.execute(
        select(GesetzI18n).where(
            GesetzI18n.gesetz_id == gesetz_id, GesetzI18n.locale == locale
        )
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        if data.titel is None or data.kurz is None or data.desc is None:
            raise HTTPException(
                400, detail="titel, kurz, desc erforderlich für neue i18n-Zeile"
            )
        i18n = GesetzI18n(
            gesetz_id=gesetz_id,
            locale=locale,
            titel=data.titel,
            kurz=data.kurz,
            desc=data.desc,
        )
        db.add(i18n)
    else:
        if data.titel is not None:
            i18n.titel = data.titel
        if data.kurz is not None:
            i18n.kurz = data.kurz
        if data.desc is not None:
            i18n.desc = data.desc
    await db.flush()
    content_cache_clear()
    return {"gesetz_id": gesetz_id, "locale": locale}


# --- Events ---


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
    _validate_locale(locale)
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
            "effekt_al": _to_float(r.effekt_al),
            "effekt_hh": _to_float(r.effekt_hh),
            "effekt_gi": _to_float(r.effekt_gi),
            "effekt_zf": _to_float(r.effekt_zf),
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
    _validate_locale(locale)
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


# --- Bundesrat ---


@router.get("/bundesrat")
async def admin_list_bundesrat(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BundesratFraktion))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "laender": r.laender or [],
            "basis_bereitschaft": r.basis_bereitschaft,
            "beziehung_start": r.beziehung_start,
            "sonderregel": r.sonderregel,
            "partei_id": r.partei_id,
            "sprecher_initials": r.sprecher_initials,
            "sprecher_color": r.sprecher_color,
        }
        for r in rows
    ]


@router.post("/bundesrat")
async def admin_create_bundesrat(
    data: BundesratFraktionCreate, db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(BundesratFraktion).where(BundesratFraktion.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Bundesrat-Fraktion '{data.id}' existiert bereits")
    f = BundesratFraktion(
        id=data.id,
        laender=data.laender,
        basis_bereitschaft=data.basis_bereitschaft,
        beziehung_start=data.beziehung_start,
        sonderregel=data.sonderregel,
        partei_id=data.partei_id,
        sprecher_initials=data.sprecher_initials,
        sprecher_color=data.sprecher_color,
    )
    db.add(f)
    await db.flush()
    content_cache_clear()
    return {"id": f.id}


@router.put("/bundesrat/{fraktion_id}/i18n/{locale}")
async def admin_upsert_bundesrat_i18n(
    fraktion_id: str,
    locale: str,
    data: BundesratFraktionI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    _validate_locale(locale)
    result = await db.execute(
        select(BundesratFraktionI18n).where(
            BundesratFraktionI18n.fraktion_id == fraktion_id,
            BundesratFraktionI18n.locale == locale,
        )
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        if (
            data.name is None
            or data.sprecher_name is None
            or data.sprecher_partei is None
            or data.sprecher_land is None
            or data.sprecher_bio is None
        ):
            raise HTTPException(
                400,
                detail="name, sprecher_name, sprecher_partei, sprecher_land, sprecher_bio erforderlich für neue i18n-Zeile",
            )
        i18n = BundesratFraktionI18n(
            fraktion_id=fraktion_id,
            locale=locale,
            name=data.name,
            sprecher_name=data.sprecher_name,
            sprecher_partei=data.sprecher_partei,
            sprecher_land=data.sprecher_land,
            sprecher_bio=data.sprecher_bio,
        )
        db.add(i18n)
    else:
        if data.name is not None:
            i18n.name = data.name
        if data.sprecher_name is not None:
            i18n.sprecher_name = data.sprecher_name
        if data.sprecher_partei is not None:
            i18n.sprecher_partei = data.sprecher_partei
        if data.sprecher_land is not None:
            i18n.sprecher_land = data.sprecher_land
        if data.sprecher_bio is not None:
            i18n.sprecher_bio = data.sprecher_bio
    await db.flush()
    content_cache_clear()
    return {"fraktion_id": fraktion_id, "locale": locale}


@router.get("/bundesrat/{fraktion_id}/tradeoffs")
async def admin_list_bundesrat_tradeoffs(
    fraktion_id: str, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BundesratTradeoff).where(BundesratTradeoff.fraktion_id == fraktion_id)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "tradeoff_key": r.tradeoff_key,
            "effekt_al": _to_float(r.effekt_al),
            "effekt_hh": _to_float(r.effekt_hh),
            "effekt_gi": _to_float(r.effekt_gi),
            "effekt_zf": _to_float(r.effekt_zf),
            "char_mood": r.char_mood or {},
        }
        for r in rows
    ]


@router.post("/bundesrat/{fraktion_id}/tradeoffs")
async def admin_create_bundesrat_tradeoff(
    fraktion_id: str,
    data: BundesratTradeoffCreate,
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(BundesratFraktion).where(BundesratFraktion.id == fraktion_id)
    )
    if not r.scalar_one_or_none():
        raise HTTPException(404, detail="Bundesrat-Fraktion nicht gefunden")
    t = BundesratTradeoff(
        fraktion_id=fraktion_id,
        tradeoff_key=data.tradeoff_key,
        effekt_al=Decimal(str(data.effekt_al)),
        effekt_hh=Decimal(str(data.effekt_hh)),
        effekt_gi=Decimal(str(data.effekt_gi)),
        effekt_zf=Decimal(str(data.effekt_zf)),
        char_mood=data.char_mood,
    )
    db.add(t)
    await db.flush()
    content_cache_clear()
    return {"id": t.id, "tradeoff_key": t.tradeoff_key}


@router.put("/bundesrat/{fraktion_id}/tradeoffs/{tradeoff_id}/i18n/{locale}")
async def admin_upsert_bundesrat_tradeoff_i18n(
    fraktion_id: str,
    tradeoff_id: int,
    locale: str,
    data: BundesratTradeoffI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    _validate_locale(locale)
    result = await db.execute(
        select(BundesratTradeoff).where(
            BundesratTradeoff.id == tradeoff_id,
            BundesratTradeoff.fraktion_id == fraktion_id,
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, detail="Bundesrat-Tradeoff nicht gefunden")
    r = await db.execute(
        select(BundesratTradeoffI18n).where(
            BundesratTradeoffI18n.tradeoff_id == tradeoff_id,
            BundesratTradeoffI18n.locale == locale,
        )
    )
    i18n = r.scalar_one_or_none()
    if not i18n:
        if data.label is None or data.desc is None:
            raise HTTPException(
                400,
                detail="label, desc erforderlich für neue i18n-Zeile",
            )
        i18n = BundesratTradeoffI18n(
            tradeoff_id=tradeoff_id,
            locale=locale,
            label=data.label,
            desc=data.desc,
        )
        db.add(i18n)
    else:
        if data.label is not None:
            i18n.label = data.label
        if data.desc is not None:
            i18n.desc = data.desc
    await db.flush()
    content_cache_clear()
    return {"tradeoff_id": tradeoff_id, "locale": locale}
