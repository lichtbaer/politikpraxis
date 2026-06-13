"""DB-basierter Content-Service für /api/content/chars, gesetze, events, bundesrat, game."""

import time
from collections.abc import Awaitable, Callable, Sequence
from typing import Any

from sqlalchemy import Select, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.content import (
    AgendaZiel,
    AgendaZielI18n,
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
    Char,
    CharI18n,
    EuEvent,
    EuEventChoice,
    EuEventChoiceI18n,
    EuEventI18n,
    Event,
    EventChoice,
    EventChoiceI18n,
    EventI18n,
    Gesetz,
    GesetzI18n,
    KoalitionsZiel,
    KoalitionsZielI18n,
    Milieu,
    MilieuI18n,
    Partei,
    Politikfeld,
    PolitikfeldI18n,
    Verband,
    VerbandI18n,
    VerbandsTradeoff,
    VerbandsTradeoffI18n,
)
from app.models.medien_akteur import MedienAkteur, MedienAkteurI18n

# Erweiterung: neue Sprache hier ergänzen + PgEnum-Migration + Frontend-Locale-Dateien
VALID_LOCALES = frozenset({"de", "en"})
LOCALE_FALLBACK = {"en": "de", "de": "en"}
CACHE_TTL = 3600  # 1 Stunde
_content_cache: dict[tuple[str, str], tuple[Any, float]] = {}


def content_cache_clear() -> None:
    """Leert den Content-Cache (z.B. nach Admin-Schreiboperationen)."""
    _content_cache.clear()


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


def _effekte(
    al: float | None, hh: float | None, gi: float | None, zf: float | None
) -> dict[str, float]:
    return {
        "al": float(al or 0),
        "hh": float(hh or 0),
        "gi": float(gi or 0),
        "zf": float(zf or 0),
    }


def _ideologie(
    wirtschaft: int | None, gesellschaft: int | None, staat: int | None
) -> dict[str, int]:
    return {
        "wirtschaft": int(wirtschaft or 0),
        "gesellschaft": int(gesellschaft or 0),
        "staat": int(staat or 0),
    }


# ---------------------------------------------------------------------------
# Generic cached i18n fetch helper (per-item locale fallback)
# ---------------------------------------------------------------------------


def _fallback_locale(locale: str) -> str:
    return LOCALE_FALLBACK.get(locale, "de")


def _pick_i18n(
    primary: Any | None,
    fallback: Any | None,
    field: str,
    default: Any = None,
) -> Any:
    """Primäre Locale bevorzugen, sonst Fallback-Locale für ein i18n-Feld."""
    if primary is not None:
        val = getattr(primary, field, None)
        if val is not None:
            return val
    if fallback is not None:
        val = getattr(fallback, field, None)
        if val is not None:
            return val
    return default


async def _fetch_cached_i18n(
    db: AsyncSession,
    locale: str,
    cache_key: tuple[str, str],
    build_stmt: Callable[[str, str], Select[Any]],
    map_rows: Callable[[Sequence[Any], str, AsyncSession], Awaitable[list[dict]]],
) -> list[dict]:
    """Cache → alle Basiszeilen mit LEFT JOIN primär + Fallback-Locale → map."""
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    fallback = _fallback_locale(locale)
    result = await db.execute(build_stmt(locale, fallback))
    rows_raw = result.all()
    rows = await map_rows(rows_raw, locale, db)
    _set_cached(cache_key, rows)
    return rows


# ---------------------------------------------------------------------------
# Individual fetch functions (using the generic helper)
# ---------------------------------------------------------------------------


async def fetch_medien_akteure(db: AsyncSession, locale: str = "de") -> list[dict]:
    """Medienakteure aus DB mit lokalisiertem Namen (LEFT JOIN auf medien_akteure_i18n)."""

    cache_key = ("medien_akteure", locale)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    stmt = (
        select(MedienAkteur, MedienAkteurI18n)
        .outerjoin(
            MedienAkteurI18n,
            (MedienAkteur.id == MedienAkteurI18n.akteur_id)
            & (MedienAkteurI18n.locale == locale),
        )
        .order_by(MedienAkteur.id)
    )
    rows_raw = (await db.execute(stmt)).all()

    # Fallback auf DE wenn i18n-Eintrag fehlt
    fallback_locale = LOCALE_FALLBACK.get(locale, "de")
    if any(i18n_row is None for _, i18n_row in rows_raw):
        fallback_stmt = (
            select(MedienAkteur, MedienAkteurI18n)
            .outerjoin(
                MedienAkteurI18n,
                (MedienAkteur.id == MedienAkteurI18n.akteur_id)
                & (MedienAkteurI18n.locale == fallback_locale),
            )
            .order_by(MedienAkteur.id)
        )
        fallback_rows = {r.id: i for r, i in (await db.execute(fallback_stmt)).all()}
    else:
        fallback_rows = {}

    out = []
    for r, i18n_row in rows_raw:
        resolved = i18n_row or fallback_rows.get(r.id)
        name = resolved.name if resolved else r.name_de
        out.append(
            {
                "id": r.id,
                "name": name,
                "typ": r.typ,
                "reichweite": float(r.reichweite),
                "stimmung_start": int(r.stimmung_start or 0),
                "min_complexity": int(r.min_complexity or 2),
            }
        )

    _set_cached(cache_key, out)
    return out


async def fetch_chars(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(CharI18n)
        i18n_f = aliased(CharI18n)
        return (
            select(Char, i18n_p, i18n_f, Partei)
            .outerjoin(
                i18n_p,
                (Char.id == i18n_p.char_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Char.id == i18n_f.char_id) & (i18n_f.locale == fb),
            )
            .outerjoin(Partei, Char.partei_id == Partei.id)
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        rows = []
        for c, i18n_p, i18n_f, partei in rows_raw:
            row = {
                "id": c.id,
                "initials": c.initials,
                "color": c.color,
                "mood_start": c.mood_start,
                "loyalty_start": c.loyalty_start,
                "ultimatum_mood_thresh": c.ultimatum_mood_thresh,
                "ultimatum_event_id": c.ultimatum_event_id,
                "bonus_trigger": c.bonus_trigger,
                "bonus_applies": c.bonus_applies,
                "min_complexity": c.min_complexity
                if c.min_complexity is not None
                else 1,
                "ideologie": _ideologie(
                    c.ideologie_wirtschaft, c.ideologie_gesellschaft, c.ideologie_staat
                ),
                "name": _pick_i18n(i18n_p, i18n_f, "name", ""),
                "role": _pick_i18n(i18n_p, i18n_f, "role", ""),
                "bio": _pick_i18n(i18n_p, i18n_f, "bio", ""),
                "eingangszitat": _pick_i18n(i18n_p, i18n_f, "eingangszitat"),
                "bonus_desc": _pick_i18n(i18n_p, i18n_f, "bonus_desc"),
                "interests": _pick_i18n(i18n_p, i18n_f, "interests", []) or [],
                "keyword": _pick_i18n(i18n_p, i18n_f, "keyword"),
                "pool_partei": c.pool_partei,
                "ressort": c.ressort,
                "ressort_partner": c.ressort_partner,
                "agenda": c.agenda,
                "ist_kanzler": c.ist_kanzler or False,
                "ist_partner_minister": c.ist_partner_minister or False,
                "agenda_stufe_aktuell": c.agenda_stufe_aktuell,
                "agenda_ablehnungen": c.agenda_ablehnungen or 0,
            }
            if partei:
                row["partei_id"] = c.partei_id
                row["partei_kuerzel"] = partei.kuerzel
                row["partei_farbe"] = partei.farbe
            rows.append(row)
        return rows

    return await _fetch_cached_i18n(db, locale, ("chars", locale), build_stmt, map_rows)


async def fetch_gesetze(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(GesetzI18n)
        i18n_f = aliased(GesetzI18n)
        return (
            select(Gesetz, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (Gesetz.id == i18n_p.gesetz_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Gesetz.id == i18n_f.gesetz_id) & (i18n_f.locale == fb),
            )
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        rows = []
        for g, i18n_p, i18n_f in rows_raw:
            rows.append(
                {
                    "id": g.id,
                    "tags": g.tags or [],
                    "bt_stimmen_ja": g.bt_stimmen_ja,
                    "effekte": _effekte(
                        g.effekt_al, g.effekt_hh, g.effekt_gi, g.effekt_zf
                    ),
                    "effekt_lag": g.effekt_lag,
                    "foederalismus_freundlich": g.foederalismus_freundlich or False,
                    "ideologie": _ideologie(
                        g.ideologie_wirtschaft,
                        g.ideologie_gesellschaft,
                        g.ideologie_staat,
                    ),
                    "ideologie_wert": int(g.ideologie_wert or 0),
                    "politikfeld_id": g.politikfeld_id,
                    "politikfeld_sekundaer": g.politikfeld_sekundaer or [],
                    "kosten_einmalig": float(g.kosten_einmalig or 0),
                    "kosten_laufend": float(g.kosten_laufend or 0),
                    "einnahmeeffekt": float(g.einnahmeeffekt or 0),
                    "pflichtausgaben_delta": float(g.pflichtausgaben_delta or 0),
                    "investiv": g.investiv or False,
                    "kommunal_pilot_moeglich": g.kommunal_pilot_moeglich
                    if g.kommunal_pilot_moeglich is not None
                    else True,
                    "laender_pilot_moeglich": g.laender_pilot_moeglich
                    if g.laender_pilot_moeglich is not None
                    else True,
                    "eu_initiative_moeglich": g.eu_initiative_moeglich
                    if g.eu_initiative_moeglich is not None
                    else True,
                    "framing_optionen": g.framing_optionen or [],
                    "lobby_mood_effekte": {
                        k: int(v) for k, v in (g.lobby_mood_effekte or {}).items()
                    },
                    "lobby_pk_kosten": g.lobby_pk_kosten or 12,
                    "lobby_gain_range": g.lobby_gain_range or {"min": 2, "max": 6},
                    "route_overrides": g.route_overrides or {},
                    "min_complexity": g.min_complexity
                    if g.min_complexity is not None
                    else 1,
                    "steuer_id": g.steuer_id,
                    "steuer_delta": float(g.steuer_delta)
                    if g.steuer_delta is not None
                    else None,
                    "konjunktur_effekt": float(g.konjunktur_effekt or 0),
                    "konjunktur_lag": int(g.konjunktur_lag or 0),
                    "sektor_effekte": list(g.sektor_effekte or []),
                    "locked_until_event": g.locked_until_event,
                    "zustimmungspflichtig": g.zustimmungspflichtig,
                    "langzeit_score": int(g.langzeit_score or 0),
                    "langzeitwirkung_positiv": list(g.langzeitwirkung_positiv_de or []),
                    "langzeitwirkung_negativ": list(g.langzeitwirkung_negativ_de or []),
                    "titel": _pick_i18n(i18n_p, i18n_f, "titel", ""),
                    "kurz": _pick_i18n(i18n_p, i18n_f, "kurz", ""),
                    "desc": _pick_i18n(i18n_p, i18n_f, "desc", ""),
                }
            )
        return rows

    return await _fetch_cached_i18n(
        db, locale, ("gesetze", locale), build_stmt, map_rows
    )


async def fetch_agenda_ziele(db: AsyncSession, locale: str) -> list[dict]:
    """Spieler-wählbare Agenda-Ziele (SMA-501) mit Lokalisierung."""

    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(AgendaZielI18n)
        i18n_f = aliased(AgendaZielI18n)
        return (
            select(AgendaZiel, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (AgendaZiel.id == i18n_p.agenda_ziel_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (AgendaZiel.id == i18n_f.agenda_ziel_id) & (i18n_f.locale == fb),
            )
            .order_by(AgendaZiel.id)
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        out: list[dict] = []
        for z, i18n_p, i18n_f in rows_raw:
            out.append(
                {
                    "id": z.id,
                    "kategorie": z.kategorie,
                    "schwierigkeit": int(z.schwierigkeit or 1),
                    "partei_filter": z.partei_filter,
                    "min_complexity": int(z.min_complexity or 1),
                    "bedingung_typ": z.bedingung_typ,
                    "bedingung_param": dict(z.bedingung_param or {}),
                    "titel": _pick_i18n(i18n_p, i18n_f, "titel", ""),
                    "beschreibung": _pick_i18n(i18n_p, i18n_f, "beschreibung", ""),
                }
            )
        return out

    return await _fetch_cached_i18n(
        db, locale, ("agenda_ziele", locale), build_stmt, map_rows
    )


async def fetch_koalitions_ziele(db: AsyncSession, locale: str) -> list[dict]:
    """Koalitionspartner-Ziele (SMA-501) mit Lokalisierung."""

    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(KoalitionsZielI18n)
        i18n_f = aliased(KoalitionsZielI18n)
        return (
            select(KoalitionsZiel, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (KoalitionsZiel.id == i18n_p.koalitions_ziel_id)
                & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (KoalitionsZiel.id == i18n_f.koalitions_ziel_id)
                & (i18n_f.locale == fb),
            )
            .order_by(KoalitionsZiel.id)
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        out: list[dict] = []
        for z, i18n_p, i18n_f in rows_raw:
            out.append(
                {
                    "id": z.id,
                    "partner_profil": z.partner_profil,
                    "kategorie": z.kategorie,
                    "min_complexity": int(z.min_complexity or 1),
                    "bedingung_typ": z.bedingung_typ,
                    "bedingung_param": dict(z.bedingung_param or {}),
                    "beziehung_malus": int(z.beziehung_malus or 0),
                    "titel": _pick_i18n(i18n_p, i18n_f, "titel", ""),
                    "beschreibung": _pick_i18n(i18n_p, i18n_f, "beschreibung", ""),
                }
            )
        return out

    return await _fetch_cached_i18n(
        db, locale, ("koalitions_ziele", locale), build_stmt, map_rows
    )


async def fetch_events(
    db: AsyncSession, locale: str, event_type: str | None = None
) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(EventI18n)
        i18n_f = aliased(EventI18n)
        stmt = (
            select(Event, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (Event.id == i18n_p.event_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Event.id == i18n_f.event_id) & (i18n_f.locale == fb),
            )
        )
        if event_type:
            stmt = stmt.where(Event.event_type == event_type)
        return stmt

    async def map_rows(
        rows_raw: Sequence[Any], loc: str, db_inner: AsyncSession
    ) -> list[dict]:
        event_ids = [e.id for e, _, _ in rows_raw]
        if not event_ids:
            return []
        fb = _fallback_locale(loc)
        ch_i18n_p = aliased(EventChoiceI18n)
        ch_i18n_f = aliased(EventChoiceI18n)
        all_choices_stmt = (
            select(EventChoice, ch_i18n_p, ch_i18n_f)
            .outerjoin(
                ch_i18n_p,
                (EventChoice.id == ch_i18n_p.choice_id) & (ch_i18n_p.locale == loc),
            )
            .outerjoin(
                ch_i18n_f,
                (EventChoice.id == ch_i18n_f.choice_id) & (ch_i18n_f.locale == fb),
            )
            .where(EventChoice.event_id.in_(event_ids))
        )
        all_choices_result = await db_inner.execute(all_choices_stmt)
        choices_by_event: dict[str, list[tuple[Any, Any, Any]]] = {}
        for ch, chi18n_p, chi18n_f in all_choices_result.all():
            choices_by_event.setdefault(ch.event_id, []).append(
                (ch, chi18n_p, chi18n_f)
            )

        rows = []
        for e, ei18n_p, ei18n_f in rows_raw:
            choices = []
            for ch, chi18n_p, chi18n_f in choices_by_event.get(e.id, []):
                c: dict[str, Any] = {
                    "key": ch.choice_key,
                    "type": ch.choice_type,
                    "cost_pk": ch.cost_pk or 0,
                    "effekte": _effekte(
                        ch.effekt_al, ch.effekt_hh, ch.effekt_gi, ch.effekt_zf
                    ),
                    "char_mood": ch.char_mood or {},
                    "loyalty": ch.loyalty or {},
                    "label": _pick_i18n(chi18n_p, chi18n_f, "label", ""),
                    "desc": _pick_i18n(chi18n_p, chi18n_f, "desc", ""),
                    "log_msg": _pick_i18n(chi18n_p, chi18n_f, "log_msg", ""),
                }
                if getattr(ch, "koalitionspartner_beziehung_delta", None) is not None:
                    c["koalitionspartner_beziehung_delta"] = (
                        ch.koalitionspartner_beziehung_delta
                    )
                if getattr(ch, "medienklima_delta", None) is not None:
                    c["medienklima_delta"] = ch.medienklima_delta
                if getattr(ch, "verfahren_dauer_monate", None) is not None:
                    c["verfahren_dauer_monate"] = ch.verfahren_dauer_monate
                if getattr(ch, "bundesrat_bonus", None) is not None:
                    c["bundesrat_bonus"] = ch.bundesrat_bonus
                md = getattr(ch, "milieu_delta", None)
                if md is not None:
                    c["milieu_delta"] = dict(md) if hasattr(md, "keys") else md
                if getattr(ch, "schuldenbremse_spielraum_delta", None) is not None:
                    c["schuldenbremse_spielraum_delta"] = int(
                        ch.schuldenbremse_spielraum_delta
                    )
                if getattr(ch, "steuerpolitik_modifikator_delta", None) is not None:
                    c["steuerpolitik_modifikator_delta"] = float(
                        ch.steuerpolitik_modifikator_delta
                    )
                if getattr(ch, "konjunktur_index_delta", None) is not None:
                    c["konjunktur_index_delta"] = float(ch.konjunktur_index_delta)
                vd = getattr(ch, "verband_delta", None)
                if vd is not None:
                    c["verband_delta"] = dict(vd) if hasattr(vd, "keys") else vd
                sd = getattr(ch, "sektor_delta", None)
                if sd is not None:
                    c["sektor_delta"] = dict(sd) if hasattr(sd, "keys") else sd
                hsd = getattr(ch, "haushalt_saldo_delta_mrd", None)
                if hsd is not None:
                    c["haushalt_saldo_delta_mrd"] = float(hsd)
                brj = getattr(ch, "br_relation_json", None)
                if brj is not None:
                    c["br_relation_json"] = dict(brj) if hasattr(brj, "keys") else brj
                choices.append(c)

            row: dict[str, Any] = {
                "id": e.id,
                "event_type": e.event_type,
                "trigger_type": e.trigger_type,
                "min_complexity": getattr(e, "min_complexity", None),
                "type_label": _pick_i18n(ei18n_p, ei18n_f, "type_label", ""),
                "title": _pick_i18n(ei18n_p, ei18n_f, "title", ""),
                "quote": _pick_i18n(ei18n_p, ei18n_f, "quote", ""),
                "context": _pick_i18n(ei18n_p, ei18n_f, "context", ""),
                "ticker": _pick_i18n(ei18n_p, ei18n_f, "ticker", ""),
                "choices": choices,
            }
            for attr, key in [
                ("politikfeld_id", "politikfeld_id"),
                ("trigger_druck_min", "trigger_druck_min"),
                ("trigger_milieu_key", "trigger_milieu_key"),
                ("trigger_milieu_op", "trigger_milieu_op"),
                ("trigger_milieu_val", "trigger_milieu_val"),
            ]:
                val = getattr(e, attr, None)
                if val is not None:
                    row[key] = val
            gesetz_ref = getattr(e, "gesetz_ref", None)
            if gesetz_ref:
                row["gesetz_ref"] = list(gesetz_ref)
            tt = getattr(e, "trigger_typ", None)
            if tt is not None:
                row["trigger_typ"] = tt
            tp = getattr(e, "trigger_params", None)
            if tp is not None:
                row["trigger_params"] = dict(tp) if hasattr(tp, "keys") else tp
            if hasattr(e, "einmalig"):
                row["einmalig"] = bool(e.einmalig)
            rows.append(row)
        return rows

    return await _fetch_cached_i18n(
        db, locale, ("events", f"{locale}:{event_type or 'all'}"), build_stmt, map_rows
    )


async def fetch_bundesrat(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(BundesratFraktionI18n)
        i18n_f = aliased(BundesratFraktionI18n)
        return (
            select(BundesratFraktion, i18n_p, i18n_f, Partei)
            .outerjoin(
                i18n_p,
                (BundesratFraktion.id == i18n_p.fraktion_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (BundesratFraktion.id == i18n_f.fraktion_id) & (i18n_f.locale == fb),
            )
            .outerjoin(Partei, BundesratFraktion.partei_id == Partei.id)
        )

    async def map_rows(
        rows_raw: Sequence[Any], loc: str, db_inner: AsyncSession
    ) -> list[dict]:
        fraktion_ids = [f.id for f, _, _, _ in rows_raw]
        if not fraktion_ids:
            return []
        fb = _fallback_locale(loc)
        t_i18n_p = aliased(BundesratTradeoffI18n)
        t_i18n_f = aliased(BundesratTradeoffI18n)
        all_tradeoffs_stmt = (
            select(BundesratTradeoff, t_i18n_p, t_i18n_f)
            .outerjoin(
                t_i18n_p,
                (BundesratTradeoff.id == t_i18n_p.tradeoff_id)
                & (t_i18n_p.locale == loc),
            )
            .outerjoin(
                t_i18n_f,
                (BundesratTradeoff.id == t_i18n_f.tradeoff_id)
                & (t_i18n_f.locale == fb),
            )
            .where(BundesratTradeoff.fraktion_id.in_(fraktion_ids))
        )
        all_tradeoffs_result = await db_inner.execute(all_tradeoffs_stmt)
        tradeoffs_by_fraktion: dict[str, list[tuple[Any, Any, Any]]] = {}
        for t, ti18n_p, ti18n_f in all_tradeoffs_result.all():
            tradeoffs_by_fraktion.setdefault(t.fraktion_id, []).append(
                (t, ti18n_p, ti18n_f)
            )

        rows = []
        for f, fi18n_p, fi18n_f, partei in rows_raw:
            tradeoffs = []
            for t, ti18n_p, ti18n_f in tradeoffs_by_fraktion.get(f.id, []):
                tradeoffs.append(
                    {
                        "key": t.tradeoff_key,
                        "effekte": _effekte(
                            t.effekt_al, t.effekt_hh, t.effekt_gi, t.effekt_zf
                        ),
                        "char_mood": t.char_mood or {},
                        "label": _pick_i18n(ti18n_p, ti18n_f, "label", ""),
                        "desc": _pick_i18n(ti18n_p, ti18n_f, "desc", ""),
                    }
                )

            sprecher_partei = (
                partei.kuerzel
                if partei
                else _pick_i18n(fi18n_p, fi18n_f, "sprecher_partei")
            )
            sprecher_color = partei.farbe if partei else f.sprecher_color
            rows.append(
                {
                    "id": f.id,
                    "laender": f.laender or [],
                    "basis_bereitschaft": f.basis_bereitschaft,
                    "beziehung_start": f.beziehung_start,
                    "sonderregel": f.sonderregel,
                    "sprecher_initials": f.sprecher_initials,
                    "sprecher_color": sprecher_color,
                    "name": _pick_i18n(fi18n_p, fi18n_f, "name", ""),
                    "sprecher_name": _pick_i18n(fi18n_p, fi18n_f, "sprecher_name", ""),
                    "sprecher_partei": sprecher_partei,
                    "sprecher_land": _pick_i18n(fi18n_p, fi18n_f, "sprecher_land", ""),
                    "sprecher_bio": _pick_i18n(fi18n_p, fi18n_f, "sprecher_bio", ""),
                    "partei_id": f.partei_id,
                    "partei_kuerzel": partei.kuerzel if partei else None,
                    "partei_farbe": partei.farbe if partei else None,
                    "tradeoffs": tradeoffs,
                }
            )
        return rows

    return await _fetch_cached_i18n(
        db, locale, ("bundesrat", locale), build_stmt, map_rows
    )


async def fetch_bundeslaender(db: AsyncSession, locale: str = "de") -> list[dict]:
    """Statische Länder-Profile mit lokalisiertem Namen (LEFT JOIN bundeslaender_i18n)."""
    cache_key = ("bundeslaender", locale)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    fallback = LOCALE_FALLBACK.get(locale, "de")
    result = await db.execute(
        text("""
            SELECT b.id, b.name_de, b.partei, b.koalition, b.bundesrat_fraktion,
                   b.wirtschaft_typ, b.themen, b.beziehung_start, b.stimmgewicht,
                   b.min_complexity,
                   COALESCE(i.name, fb.name, b.name_de) AS name
            FROM bundeslaender b
            LEFT JOIN bundeslaender_i18n i
                   ON i.land_id = b.id AND i.locale = :locale
            LEFT JOIN bundeslaender_i18n fb
                   ON fb.land_id = b.id AND fb.locale = :fallback
            ORDER BY b.id
        """),
        {"locale": locale, "fallback": fallback},
    )
    rows = [
        {
            "id": r[0],
            "name": r[10],
            "partei": r[2],
            "koalition": list(r[3] or []),
            "bundesrat_fraktion": r[4],
            "wirtschaft_typ": r[5],
            "themen": list(r[6] or []),
            "beziehung_start": int(r[7] or 50),
            "stimmgewicht": int(r[8] or 4),
            "min_complexity": int(r[9] or 2),
        }
        for r in result.all()
    ]
    _set_cached(cache_key, rows)
    return rows


async def fetch_eu_events(db: AsyncSession, locale: str) -> list[dict]:
    """Lädt alle EU-Events mit Choices für die gegebene Locale."""

    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(EuEventI18n)
        i18n_f = aliased(EuEventI18n)
        return (
            select(EuEvent, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (EuEvent.id == i18n_p.event_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (EuEvent.id == i18n_f.event_id) & (i18n_f.locale == fb),
            )
        )

    async def map_rows(
        rows_raw: Sequence[Any], loc: str, db_inner: AsyncSession
    ) -> list[dict]:
        fb = _fallback_locale(loc)
        ch_i18n_p = aliased(EuEventChoiceI18n)
        ch_i18n_f = aliased(EuEventChoiceI18n)
        rows = []
        for e, ei18n_p, ei18n_f in rows_raw:
            ch_stmt = (
                select(EuEventChoice, ch_i18n_p, ch_i18n_f)
                .outerjoin(
                    ch_i18n_p,
                    (EuEventChoice.id == ch_i18n_p.choice_id)
                    & (ch_i18n_p.locale == loc),
                )
                .outerjoin(
                    ch_i18n_f,
                    (EuEventChoice.id == ch_i18n_f.choice_id)
                    & (ch_i18n_f.locale == fb),
                )
                .where(EuEventChoice.event_id == e.id)
            )
            ch_result = await db_inner.execute(ch_stmt)
            choices_raw = ch_result.all()

            choices = []
            for ch, chi18n_p, chi18n_f in choices_raw:
                choices.append(
                    {
                        "key": ch.choice_key,
                        "cost_pk": ch.cost_pk or 0,
                        "effekte": _effekte(
                            ch.effekt_al, ch.effekt_hh, ch.effekt_gi, ch.effekt_zf
                        ),
                        "eu_klima_delta": ch.eu_klima_delta or 0,
                        "kofinanzierung": float(ch.kofinanzierung or 0),
                        "label": _pick_i18n(chi18n_p, chi18n_f, "label", ""),
                        "desc": _pick_i18n(chi18n_p, chi18n_f, "desc", ""),
                        "log_msg": _pick_i18n(chi18n_p, chi18n_f, "log_msg", ""),
                    }
                )

            rows.append(
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "politikfeld_id": e.politikfeld_id,
                    "trigger_klima_min": e.trigger_klima_min,
                    "trigger_monat": e.trigger_monat,
                    "min_complexity": e.min_complexity or 3,
                    "title": _pick_i18n(ei18n_p, ei18n_f, "title", ""),
                    "quote": _pick_i18n(ei18n_p, ei18n_f, "quote", ""),
                    "context": _pick_i18n(ei18n_p, ei18n_f, "context", ""),
                    "ticker": _pick_i18n(ei18n_p, ei18n_f, "ticker", ""),
                    "choices": choices,
                }
            )
        return rows

    return await _fetch_cached_i18n(
        db, locale, ("eu_events", locale), build_stmt, map_rows
    )


async def fetch_milieus(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(MilieuI18n)
        i18n_f = aliased(MilieuI18n)
        return (
            select(Milieu, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (Milieu.id == i18n_p.milieu_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Milieu.id == i18n_f.milieu_id) & (i18n_f.locale == fb),
            )
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        return [
            {
                "id": m.id,
                "gewicht": m.gewicht,
                "basisbeteiligung": m.basisbeteiligung,
                "ideologie": _ideologie(
                    m.ideologie_wirtschaft, m.ideologie_gesellschaft, m.ideologie_staat
                ),
                "min_complexity": m.min_complexity or 1,
                "aggregat_gruppe": m.aggregat_gruppe,
                "name": _pick_i18n(i18n_p, i18n_f, "name", ""),
                "kurzcharakter": _pick_i18n(i18n_p, i18n_f, "kurzcharakter", ""),
                "beschreibung": _pick_i18n(i18n_p, i18n_f, "beschreibung", ""),
            }
            for m, i18n_p, i18n_f in rows_raw
        ]

    return await _fetch_cached_i18n(
        db, locale, ("milieus", locale), build_stmt, map_rows
    )


async def fetch_politikfelder(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(PolitikfeldI18n)
        i18n_f = aliased(PolitikfeldI18n)
        return (
            select(Politikfeld, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (Politikfeld.id == i18n_p.feld_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Politikfeld.id == i18n_f.feld_id) & (i18n_f.locale == fb),
            )
        )

    async def map_rows(
        rows_raw: Sequence[Any], _loc: str, _db: AsyncSession
    ) -> list[dict]:
        return [
            {
                "id": p.id,
                "verband_id": p.verband_id,
                "druck_event_id": p.druck_event_id,
                "eu_relevanz": p.eu_relevanz or 1,
                "kommunal_relevanz": p.kommunal_relevanz or 1,
                "min_complexity": p.min_complexity or 1,
                "name": _pick_i18n(i18n_p, i18n_f, "name", ""),
                "kurz": _pick_i18n(i18n_p, i18n_f, "kurz", ""),
            }
            for p, i18n_p, i18n_f in rows_raw
        ]

    return await _fetch_cached_i18n(
        db, locale, ("politikfelder", locale), build_stmt, map_rows
    )


async def fetch_verbaende(db: AsyncSession, locale: str) -> list[dict]:
    def build_stmt(loc: str, fb: str) -> Select[Any]:
        i18n_p = aliased(VerbandI18n)
        i18n_f = aliased(VerbandI18n)
        return (
            select(Verband, i18n_p, i18n_f)
            .outerjoin(
                i18n_p,
                (Verband.id == i18n_p.verband_id) & (i18n_p.locale == loc),
            )
            .outerjoin(
                i18n_f,
                (Verband.id == i18n_f.verband_id) & (i18n_f.locale == fb),
            )
        )

    async def map_rows(
        rows_raw: Sequence[Any], loc: str, db_inner: AsyncSession
    ) -> list[dict]:
        fb = _fallback_locale(loc)
        t_i18n_p = aliased(VerbandsTradeoffI18n)
        t_i18n_f = aliased(VerbandsTradeoffI18n)
        rows = []
        for v, i18n_p, i18n_f in rows_raw:
            t_stmt = (
                select(VerbandsTradeoff, t_i18n_p, t_i18n_f)
                .outerjoin(
                    t_i18n_p,
                    (VerbandsTradeoff.id == t_i18n_p.tradeoff_id)
                    & (t_i18n_p.locale == loc),
                )
                .outerjoin(
                    t_i18n_f,
                    (VerbandsTradeoff.id == t_i18n_f.tradeoff_id)
                    & (t_i18n_f.locale == fb),
                )
                .where(VerbandsTradeoff.verband_id == v.id)
            )
            t_result = await db_inner.execute(t_stmt)
            tradeoffs_raw = t_result.all()

            tradeoffs = []
            for t, ti18n_p, ti18n_f in tradeoffs_raw:
                tradeoffs.append(
                    {
                        "key": t.tradeoff_key,
                        "cost_pk": t.cost_pk or 0,
                        "effekte": _effekte(
                            t.effekt_al, t.effekt_hh, t.effekt_gi, t.effekt_zf
                        ),
                        "feld_druck_delta": t.feld_druck_delta or 0,
                        "medienklima_delta": t.medienklima_delta or 0,
                        "verband_effekte": t.verband_effekte or {},
                        "label": _pick_i18n(ti18n_p, ti18n_f, "label", ""),
                        "desc": _pick_i18n(ti18n_p, ti18n_f, "desc", ""),
                    }
                )

            rows.append(
                {
                    "id": v.id,
                    "politikfeld_id": v.politikfeld_id,
                    "ideologie": _ideologie(
                        v.ideologie_wirtschaft,
                        v.ideologie_gesellschaft,
                        v.ideologie_staat,
                    ),
                    "beziehung_start": v.beziehung_start,
                    "staerke": {
                        "bund": v.staerke_bund or 1,
                        "eu": v.staerke_eu or 1,
                        "laender": v.staerke_laender or 1,
                        "kommunen": v.staerke_kommunen or 1,
                    },
                    "konflikt_mit": v.konflikt_mit or [],
                    "min_complexity": v.min_complexity or 2,
                    "name": _pick_i18n(i18n_p, i18n_f, "name", ""),
                    "kurz": _pick_i18n(i18n_p, i18n_f, "kurz", ""),
                    "bio": _pick_i18n(i18n_p, i18n_f, "bio", ""),
                    "tradeoffs": tradeoffs,
                }
            )
        return rows

    return await _fetch_cached_i18n(
        db, locale, ("verbaende", locale), build_stmt, map_rows
    )


# --- game.json-like structure (SMA-257) ---


async def get_game_content_from_db(
    db: AsyncSession, locale: str = "de"
) -> dict[str, Any]:
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
    for row in (
        await db.execute(
            text(
                "SELECT char_id, name, role, bio, eingangszitat, bonus_desc, interests, keyword FROM chars_i18n WHERE locale = :locale"
            ),
            {"locale": locale},
        )
    ).mappings():
        result["chars"][row["char_id"]] = {
            "name": row["name"],
            "role": row["role"],
            "bio": row["bio"],
            "eingangszitat": row.get("eingangszitat"),
            "tag": row["keyword"] or "",
            "interests": row["interests"] or [],
            "bonus": {"desc": row["bonus_desc"]} if row["bonus_desc"] else {},
        }

    # gesetze_i18n
    for row in (
        await db.execute(
            text(
                "SELECT gesetz_id, titel, kurz, desc FROM gesetze_i18n WHERE locale = :locale"
            ),
            {"locale": locale},
        )
    ).mappings():
        result["laws"][row["gesetz_id"]] = {
            "titel": row["titel"],
            "kurz": row["kurz"],
            "desc": row["desc"],
        }

    # events_i18n — merge random, char, bundesrat by event_id
    all_events: dict[str, dict] = {}
    for row in (
        await db.execute(
            text(
                "SELECT event_id, type_label, title, quote, context, ticker FROM events_i18n WHERE locale = :locale"
            ),
            {"locale": locale},
        )
    ).mappings():
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
    for row in (
        await db.execute(
            text(
                "SELECT choice_id, label, desc, log_msg FROM event_choices_i18n WHERE locale = :locale"
            ),
            {"locale": locale},
        )
    ).mappings():
        event_id = choice_to_event.get(row["choice_id"])
        if event_id and event_id in all_events:
            idx = len(all_events[event_id]["choices"])
            all_events[event_id]["choices"][str(idx)] = {
                "label": row["label"],
                "desc": row["desc"],
                "log": row["log_msg"],
            }

    # Split into events, charEvents, bundesratEvents
    random_ids = {
        "haushalt",
        "skandal",
        "euklage",
        "konjunktur",
        "koalition_krise",
        "demo",
        "eufoerder",
    }
    char_ids = {
        "fm_ultimatum",
        "braun_ultimatum",
        "wolf_ultimatum",
        "kern_ultimatum",
        "kanzler_ultimatum",
        "kohl_bundesrat_sabotage",
        "wm_ultimatum",
        "am_ultimatum",
        "gm_ultimatum",
        "bm_ultimatum",
        "lehmann_defizit_start",
        "haushaltskrise",
    }
    br_ids = {
        "laenderfinanzausgleich",
        "landtagswahl",
        "kohl_eskaliert",
        "sprecher_wechsel",
        "bundesrat_initiative",
        "foederalismusgipfel",
    }

    for eid, data in all_events.items():
        if eid in random_ids:
            result["events"][eid] = data
        elif eid in char_ids:
            result["charEvents"][eid] = data
        elif eid in br_ids:
            result["bundesratEvents"][eid] = data

    # bundesrat_fraktionen_i18n + parteien (SMA-288: fiktive Kürzel)
    for row in (
        await db.execute(
            text("""
            SELECT bf.id AS fraktion_id, fi.name, fi.sprecher_name,
                   COALESCE(p.kuerzel, fi.sprecher_partei) AS sprecher_partei,
                   fi.sprecher_land, fi.sprecher_bio, p.farbe AS partei_farbe
            FROM bundesrat_fraktionen bf
            JOIN bundesrat_fraktionen_i18n fi ON bf.id = fi.fraktion_id AND fi.locale = :locale
            LEFT JOIN parteien p ON bf.partei_id = p.id
        """),
            {"locale": locale},
        )
    ).mappings():
        result["bundesratFraktionen"][row["fraktion_id"]] = {
            "name": row["name"],
            "sprecher": {
                "name": row["sprecher_name"],
                "partei": row["sprecher_partei"],
                "land": row["sprecher_land"],
                "bio": row["sprecher_bio"],
                "farbe": row["partei_farbe"],
            },
            "tradeoffPool": {},
        }

    # bundesrat_tradeoffs_i18n — need tradeoff_id -> tradeoff_key and fraktion_id
    tradeoff_to_fraktion = await _get_tradeoff_fraktion_mapping(db)
    tradeoff_to_key = await _get_tradeoff_key_mapping(db)
    for row in (
        await db.execute(
            text(
                "SELECT tradeoff_id, label, desc FROM bundesrat_tradeoffs_i18n WHERE locale = :locale"
            ),
            {"locale": locale},
        )
    ).mappings():
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
    rows = await db.execute(
        text("SELECT id, fraktion_id FROM bundesrat_tradeoffs ORDER BY id")
    )
    return {r[0]: r[1] for r in rows}


async def _get_tradeoff_key_mapping(db: AsyncSession) -> dict[int, str]:
    """Map tradeoff_id -> tradeoff_key from bundesrat_tradeoffs."""
    rows = await db.execute(
        text("SELECT id, tradeoff_key FROM bundesrat_tradeoffs ORDER BY id")
    )
    return {r[0]: r[1] for r in rows}


async def fetch_gesetz_relationen(db: AsyncSession, locale: str = "de") -> list[dict]:
    """SMA-312: Lädt Gesetz-Relationen (requires, excludes, enhances)."""
    cache_key = ("gesetz_relationen", "all")
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    rows = await db.execute(
        text("""
            SELECT gesetz_a_id, gesetz_b_id, relation_typ,
                   CASE WHEN :locale = 'en' AND beschreibung_en IS NOT NULL
                        THEN beschreibung_en
                        ELSE beschreibung_de
                   END AS beschreibung,
                   enhances_faktor
            FROM gesetz_relationen
        """),
        {"locale": locale},
    )
    result = [
        {
            "gesetz_a_id": r[0],
            "gesetz_b_id": r[1],
            "relation_typ": r[2],
            "beschreibung": r[3],
            "enhances_faktor": float(r[4]) if r[4] is not None else 1.0,
        }
        for r in rows
    ]
    _set_cached(cache_key, result)
    return result
