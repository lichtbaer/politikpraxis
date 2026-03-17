"""Content from DB — locale-aware narrative content from *_i18n tables."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_game_content_from_db(db: AsyncSession, locale: str = "de") -> dict[str, Any]:
    """Build game.json-like structure from *_i18n tables for given locale."""
    if locale not in ("de", "en"):
        locale = "de"

    result: dict[str, Any] = {
        "chars": {},
        "laws": {},
        "events": {},
        "charEvents": {},
        "bundesratEvents": {},
        "bundesratFraktionen": {},
    }

    # chars_i18n
    for row in (await db.execute(
        text("SELECT char_id, name, role, bio, bonus_desc, interests, keyword FROM chars_i18n WHERE locale = :locale"),
        {"locale": locale},
    )).mappings():
        result["chars"][row["char_id"]] = {
            "name": row["name"],
            "role": row["role"],
            "bio": row["bio"],
            "tag": row["keyword"] or "",
            "interests": row["interests"] or [],
            "bonus": {"desc": row["bonus_desc"]} if row["bonus_desc"] else {},
        }

    # gesetze_i18n
    for row in (await db.execute(
        text("SELECT gesetz_id, titel, kurz, desc FROM gesetze_i18n WHERE locale = :locale"),
        {"locale": locale},
    )).mappings():
        result["laws"][row["gesetz_id"]] = {
            "titel": row["titel"],
            "kurz": row["kurz"],
            "desc": row["desc"],
        }

    # events_i18n — merge random, char, bundesrat by event_id
    all_events: dict[str, dict] = {}
    for row in (await db.execute(
        text("SELECT event_id, type_label, title, quote, context, ticker FROM events_i18n WHERE locale = :locale"),
        {"locale": locale},
    )).mappings():
        all_events[row["event_id"]] = {
            "typeLabel": row["type_label"],
            "title": row["title"],
            "quote": row["quote"],
            "context": row["context"],
            "ticker": row["ticker"],
            "choices": {},
        }

    # event_choices_i18n — need to map choice_id to event_id
    choice_to_event = await _get_choice_event_mapping(db)
    for row in (await db.execute(
        text("SELECT choice_id, label, desc, log_msg FROM event_choices_i18n WHERE locale = :locale"),
        {"locale": locale},
    )).mappings():
        event_id = choice_to_event.get(row["choice_id"])
        if event_id and event_id in all_events:
            idx = len(all_events[event_id]["choices"])
            all_events[event_id]["choices"][str(idx)] = {
                "label": row["label"],
                "desc": row["desc"],
                "log": row["log_msg"],
            }

    # Split into events, charEvents, bundesratEvents
    random_ids = {"haushalt", "skandal", "euklage", "konjunktur", "koalition_krise", "demo", "eufoerder"}
    char_ids = {"fm_ultimatum", "braun_ultimatum", "wolf_ultimatum", "kern_ultimatum", "kanzler_ultimatum", "kohl_bundesrat_sabotage", "wm_ultimatum"}
    br_ids = {"laenderfinanzausgleich", "landtagswahl", "kohl_eskaliert", "sprecher_wechsel", "bundesrat_initiative", "foederalismusgipfel"}

    for eid, data in all_events.items():
        if eid in random_ids:
            result["events"][eid] = data
        elif eid in char_ids:
            result["charEvents"][eid] = data
        elif eid in br_ids:
            result["bundesratEvents"][eid] = data

    # bundesrat_fraktionen_i18n
    for row in (await db.execute(
        text("""
            SELECT fraktion_id, name, sprecher_name, sprecher_partei, sprecher_land, sprecher_bio
            FROM bundesrat_fraktionen_i18n WHERE locale = :locale
        """),
        {"locale": locale},
    )).mappings():
        result["bundesratFraktionen"][row["fraktion_id"]] = {
            "name": row["name"],
            "sprecher": {
                "name": row["sprecher_name"],
                "partei": row["sprecher_partei"],
                "land": row["sprecher_land"],
                "bio": row["sprecher_bio"],
            },
            "tradeoffPool": {},
        }

    # bundesrat_tradeoffs_i18n — need tradeoff_id -> tradeoff_key and fraktion_id
    tradeoff_to_fraktion = await _get_tradeoff_fraktion_mapping(db)
    tradeoff_to_key = await _get_tradeoff_key_mapping(db)
    for row in (await db.execute(
        text("SELECT tradeoff_id, label, desc FROM bundesrat_tradeoffs_i18n WHERE locale = :locale"),
        {"locale": locale},
    )).mappings():
        tid = row["tradeoff_id"]
        fid = tradeoff_to_fraktion.get(tid)
        tkey = tradeoff_to_key.get(tid)
        if fid and tkey and fid in result["bundesratFraktionen"]:
            result["bundesratFraktionen"][fid]["tradeoffPool"][tkey] = {
                "label": row["label"],
                "desc": row["desc"],
            }

    return result


async def _get_choice_event_mapping(db: AsyncSession) -> dict[int, str]:
    """Map choice_id -> event_id from event_choices."""
    rows = await db.execute(text("SELECT id, event_id FROM event_choices ORDER BY id"))
    return {r[0]: r[1] for r in rows}


async def _get_tradeoff_fraktion_mapping(db: AsyncSession) -> dict[int, str]:
    """Map tradeoff_id -> fraktion_id from bundesrat_tradeoffs."""
    rows = await db.execute(text("SELECT id, fraktion_id FROM bundesrat_tradeoffs ORDER BY id"))
    return {r[0]: r[1] for r in rows}


async def _get_tradeoff_key_mapping(db: AsyncSession) -> dict[int, str]:
    """Map tradeoff_id -> tradeoff_key from bundesrat_tradeoffs."""
    rows = await db.execute(text("SELECT id, tradeoff_key FROM bundesrat_tradeoffs ORDER BY id"))
    return {r[0]: r[1] for r in rows}
