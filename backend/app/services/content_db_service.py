"""DB-basierter Content-Service für /api/content/chars, gesetze, events, bundesrat."""

import time
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import (
    Char,
    CharI18n,
    Gesetz,
    GesetzI18n,
    Event,
    EventI18n,
    EventChoice,
    EventChoiceI18n,
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
)

VALID_LOCALES = frozenset({"de", "en"})
CACHE_TTL = 3600  # 1 Stunde
_content_cache: dict[tuple[str, str], tuple[Any, float]] = {}


def _get_cached(cache_key: tuple[str, str]) -> Any | None:
    """Liefert gecachtes Ergebnis wenn noch gültig."""
    now = time.time()
    if cache_key in _content_cache:
        data, expiry = _content_cache[cache_key]
        if now < expiry:
            return data
    return None


def _set_cached(cache_key: tuple[str, str], data: Any) -> None:
    _content_cache[cache_key] = (data, time.time() + CACHE_TTL)


def _effekte(al: float | None, hh: float | None, gi: float | None, zf: float | None) -> dict[str, float]:
    return {
        "al": float(al or 0),
        "hh": float(hh or 0),
        "gi": float(gi or 0),
        "zf": float(zf or 0),
    }


async def fetch_chars(db: AsyncSession, locale: str) -> list[dict]:
    cache_key = ("chars", locale)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    use_locale = locale
    stmt = (
        select(Char, CharI18n)
        .join(CharI18n, (Char.id == CharI18n.char_id) & (CharI18n.locale == use_locale))
    )
    result = await db.execute(stmt)
    rows_raw = result.all()

    if not rows_raw and locale == "en":
        use_locale = "de"
        stmt = (
            select(Char, CharI18n)
            .join(CharI18n, (Char.id == CharI18n.char_id) & (CharI18n.locale == "de"))
        )
        result = await db.execute(stmt)
        rows_raw = result.all()

    rows = []
    for c, i18n in rows_raw:
        rows.append({
            "id": c.id,
            "initials": c.initials,
            "color": c.color,
            "mood_start": c.mood_start,
            "loyalty_start": c.loyalty_start,
            "ultimatum_mood_thresh": c.ultimatum_mood_thresh,
            "ultimatum_event_id": c.ultimatum_event_id,
            "bonus_trigger": c.bonus_trigger,
            "bonus_applies": c.bonus_applies,
            "name": i18n.name,
            "role": i18n.role,
            "bio": i18n.bio,
            "bonus_desc": i18n.bonus_desc,
            "interests": i18n.interests or [],
            "keyword": i18n.keyword,
        })
    _set_cached(cache_key, rows)
    return rows


async def fetch_gesetze(db: AsyncSession, locale: str) -> list[dict]:
    cache_key = ("gesetze", locale)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    use_locale = locale
    stmt = (
        select(Gesetz, GesetzI18n)
        .join(GesetzI18n, (Gesetz.id == GesetzI18n.gesetz_id) & (GesetzI18n.locale == use_locale))
    )
    result = await db.execute(stmt)
    rows_raw = result.all()

    if not rows_raw and locale == "en":
        use_locale = "de"
        stmt = (
            select(Gesetz, GesetzI18n)
            .join(GesetzI18n, (Gesetz.id == GesetzI18n.gesetz_id) & (GesetzI18n.locale == "de"))
        )
        result = await db.execute(stmt)
        rows_raw = result.all()

    rows = []
    for g, i18n in rows_raw:
        rows.append({
            "id": g.id,
            "tags": g.tags or [],
            "bt_stimmen_ja": g.bt_stimmen_ja,
            "effekte": _effekte(g.effekt_al, g.effekt_hh, g.effekt_gi, g.effekt_zf),
            "effekt_lag": g.effekt_lag,
            "foederalismus_freundlich": g.foederalismus_freundlich or False,
            "titel": i18n.titel,
            "kurz": i18n.kurz,
            "desc": i18n.desc,
        })
    _set_cached(cache_key, rows)
    return rows


async def fetch_events(
    db: AsyncSession, locale: str, event_type: str | None = None
) -> list[dict]:
    cache_key = ("events", f"{locale}:{event_type or 'all'}")
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    use_locale = locale
    stmt = (
        select(Event, EventI18n)
        .join(EventI18n, (Event.id == EventI18n.event_id) & (EventI18n.locale == use_locale))
    )
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    result = await db.execute(stmt)
    events_raw = result.all()

    if not events_raw and locale == "en":
        use_locale = "de"
        stmt = (
            select(Event, EventI18n)
            .join(EventI18n, (Event.id == EventI18n.event_id) & (EventI18n.locale == "de"))
        )
        if event_type:
            stmt = stmt.where(Event.event_type == event_type)
        result = await db.execute(stmt)
        events_raw = result.all()

    rows = []
    for e, ei18n in events_raw:
        # Lade Choices für dieses Event
        ch_stmt = (
            select(EventChoice, EventChoiceI18n)
            .join(
                EventChoiceI18n,
                (EventChoice.id == EventChoiceI18n.choice_id)
                & (EventChoiceI18n.locale == use_locale),
            )
            .where(EventChoice.event_id == e.id)
        )
        ch_result = await db.execute(ch_stmt)
        choices_raw = ch_result.all()

        choices = []
        for ch, chi18n in choices_raw:
            choices.append({
                "key": ch.choice_key,
                "type": ch.choice_type,
                "cost_pk": ch.cost_pk or 0,
                "effekte": _effekte(ch.effekt_al, ch.effekt_hh, ch.effekt_gi, ch.effekt_zf),
                "char_mood": ch.char_mood or {},
                "label": chi18n.label,
                "desc": chi18n.desc,
                "log_msg": chi18n.log_msg,
            })

        rows.append({
            "id": e.id,
            "event_type": e.event_type,
            "trigger_type": e.trigger_type,
            "min_complexity": e.min_complexity,
            "type_label": ei18n.type_label,
            "title": ei18n.title,
            "quote": ei18n.quote,
            "context": ei18n.context,
            "ticker": ei18n.ticker,
            "choices": choices,
        })
    _set_cached(cache_key, rows)
    return rows


async def fetch_bundesrat(db: AsyncSession, locale: str) -> list[dict]:
    cache_key = ("bundesrat", locale)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    use_locale = locale
    stmt = (
        select(BundesratFraktion, BundesratFraktionI18n)
        .join(
            BundesratFraktionI18n,
            (BundesratFraktion.id == BundesratFraktionI18n.fraktion_id)
            & (BundesratFraktionI18n.locale == use_locale),
        )
    )
    result = await db.execute(stmt)
    fraktionen_raw = result.all()

    if not fraktionen_raw and locale == "en":
        use_locale = "de"
        stmt = (
            select(BundesratFraktion, BundesratFraktionI18n)
            .join(
                BundesratFraktionI18n,
                (BundesratFraktion.id == BundesratFraktionI18n.fraktion_id)
                & (BundesratFraktionI18n.locale == "de"),
            )
        )
        result = await db.execute(stmt)
        fraktionen_raw = result.all()

    rows = []
    for f, fi18n in fraktionen_raw:
        t_stmt = (
            select(BundesratTradeoff, BundesratTradeoffI18n)
            .join(
                BundesratTradeoffI18n,
                (BundesratTradeoff.id == BundesratTradeoffI18n.tradeoff_id)
                & (BundesratTradeoffI18n.locale == use_locale),
            )
            .where(BundesratTradeoff.fraktion_id == f.id)
        )
        t_result = await db.execute(t_stmt)
        tradeoffs_raw = t_result.all()

        tradeoffs = []
        for t, ti18n in tradeoffs_raw:
            tradeoffs.append({
                "key": t.tradeoff_key,
                "effekte": _effekte(t.effekt_al, t.effekt_hh, t.effekt_gi, t.effekt_zf),
                "char_mood": t.char_mood or {},
                "label": ti18n.label,
                "desc": ti18n.desc,
            })

        rows.append({
            "id": f.id,
            "laender": f.laender or [],
            "basis_bereitschaft": f.basis_bereitschaft,
            "beziehung_start": f.beziehung_start,
            "sprecher_initials": f.sprecher_initials,
            "sprecher_color": f.sprecher_color,
            "name": fi18n.name,
            "sprecher_name": fi18n.sprecher_name,
            "sprecher_partei": fi18n.sprecher_partei,
            "sprecher_land": fi18n.sprecher_land,
            "sprecher_bio": fi18n.sprecher_bio,
            "tradeoffs": tradeoffs,
        })
    _set_cached(cache_key, rows)
    return rows
