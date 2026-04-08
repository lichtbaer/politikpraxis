"""
SMA-507: Historisches Urteil + Kanzler-Archetyp (serverseitig, Stufe 4).

Berechnung gemäß Ticket: Langzeit-Summe, Haushalt, Milieu-Spread, Institutionen;
Note mit denselben Schwellen wie Legislatur-Bilanz (80/60/40/20).
"""

from __future__ import annotations

from typing import Any

# Wie frontend/src/core/systems/wahlkampf.ts noteFromPunkte
_NOTE_THRESHOLDS = (
    (80, "A"),
    (60, "B"),
    (40, "C"),
    (20, "D"),
)


def _num(raw: Any, fallback: float = 0.0) -> float:
    if isinstance(raw, bool):
        return float(fallback)
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        return float(raw)
    except (TypeError, ValueError):
        return fallback


def _bool(raw: Any) -> bool:
    return raw is True


def _beschlossene_gesetz_ids(gs: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for g in gs.get("gesetze") or []:
        if not isinstance(g, dict):
            continue
        if g.get("status") != "beschlossen":
            continue
        gid = g.get("id")
        if isinstance(gid, str) and gid:
            out.append(gid)
    return out


def _content_row_by_id(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    m: dict[str, dict[str, Any]] = {}
    for r in rows:
        if isinstance(r, dict):
            rid = r.get("id")
            if isinstance(rid, str):
                m[rid] = r
    return m


def collect_positive_effects(
    beschlossene_ids: list[str], content_by_id: dict[str, dict[str, Any]]
) -> list[str]:
    """Sammelt Langzeitwirkung-positiv-Texte aus Content, dedupliziert (Reihenfolge stabil)."""
    seen: set[str] = set()
    ordered: list[str] = []
    for gid in beschlossene_ids:
        row = content_by_id.get(gid)
        if not row:
            continue
        raw = row.get("langzeitwirkung_positiv")
        if not isinstance(raw, list):
            continue
        for item in raw:
            if not isinstance(item, str):
                continue
            s = item.strip()
            if not s or s in seen:
                continue
            seen.add(s)
            ordered.append(s)
    return ordered


def collect_negative_effects(
    beschlossene_ids: list[str], content_by_id: dict[str, dict[str, Any]]
) -> list[str]:
    """Sammelt Langzeitwirkung-negativ-Texte aus Content, dedupliziert."""
    seen: set[str] = set()
    ordered: list[str] = []
    for gid in beschlossene_ids:
        row = content_by_id.get(gid)
        if not row:
            continue
        raw = row.get("langzeitwirkung_negativ")
        if not isinstance(raw, list):
            continue
        for item in raw:
            if not isinstance(item, str):
                continue
            s = item.strip()
            if not s or s in seen:
                continue
            seen.add(s)
            ordered.append(s)
    return ordered


def _milieu_spread(gs: dict[str, Any]) -> float:
    """Spread max−min Milieu-Zustimmung (History-Ø bevorzugt, sonst Snapshot)."""
    mh = gs.get("milieuHistory")
    avgs: list[float] = []
    if isinstance(mh, dict) and mh:
        for _mid, cur in mh.items():
            if isinstance(cur, dict):
                months = int(_num(cur.get("months")))
                if months > 0:
                    avgs.append(_num(cur.get("sum")) / months)
    if len(avgs) >= 2:
        return max(avgs) - min(avgs)
    z = gs.get("milieuZustimmung")
    if isinstance(z, dict):
        vals = [_num(v) for v in z.values() if isinstance(v, (int, float))]
        if len(vals) >= 2:
            return max(vals) - min(vals)
    return 0.0


def _score_haushalt_nachhaltigkeit(saldo_kumulativ: float) -> int:
    if saldo_kumulativ >= 0:
        return 5
    if saldo_kumulativ >= -30:
        return 0
    return -5


def _score_gesellschafts_stabilitaet(spread: float) -> int:
    if spread < 25:
        return 5
    if spread < 40:
        return 2
    return -3


def _score_institutionen_integritaet(gs: dict[str, Any]) -> int:
    if _bool(gs.get("verfassungsgerichtAktiv")):
        return -10
    if _bool(gs.get("extremismusWarnung")):
        return -5
    return 3


def _note_from_punkte(punkte: int) -> str:
    for thresh, note in _NOTE_THRESHOLDS:
        if punkte >= thresh:
            return note
    return "F"


def berechne_historisches_urteil(
    game_state: dict[str, Any],
    gesetze_content: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Liefert Auswertungs-Dict (ohne GameState zu mutieren).

    Gesamtscore = Summe langzeit_score (Content) + Haushalt + Gesellschaft + Institutionen.
    Punkte für Note: auf 0–100 begrenzt (gleiche Schwellen wie bilanzNote).
    """
    ids = _beschlossene_gesetz_ids(game_state)
    by_id = _content_row_by_id(gesetze_content)

    langzeit_sum = 0
    for gid in ids:
        row = by_id.get(gid)
        if row:
            langzeit_sum += int(_num(row.get("langzeit_score")))

    hh = game_state.get("haushalt")
    saldo = _num(hh.get("saldoKumulativ")) if isinstance(hh, dict) else 0.0
    haushalt_pts = _score_haushalt_nachhaltigkeit(saldo)

    spread = _milieu_spread(game_state)
    gesellschaft_pts = _score_gesellschafts_stabilitaet(spread)

    inst_pts = _score_institutionen_integritaet(game_state)

    roh = langzeit_sum + haushalt_pts + gesellschaft_pts + inst_pts
    punkte = int(max(0, min(100, round(roh))))
    note = _note_from_punkte(punkte)

    pos = collect_positive_effects(ids, by_id)
    neg = collect_negative_effects(ids, by_id)

    return {
        "historischesUrteilPunkte": punkte,
        "historischesUrteilNote": note,
        "historischesUrteilRohscore": int(round(roh)),
        "historischesUrteilDetail": {
            "langzeitScoreSumme": langzeit_sum,
            "haushaltNachhaltigkeit": haushalt_pts,
            "gesellschaftsStabilitaet": gesellschaft_pts,
            "institutionenIntegritaet": inst_pts,
            "milieuSpread": round(spread, 2),
        },
        "langzeitwirkungenPositiv": pos,
        "langzeitwirkungenNegativ": neg,
    }


def _bilanz_qualitativ(gs: dict[str, Any], key: str) -> str | None:
    b = gs.get("legislaturBilanz")
    if not isinstance(b, dict):
        return None
    v = b.get(key)
    return v if isinstance(v, str) else None


def ermittle_kanzler_archetyp(
    game_state: dict[str, Any],
    urteil_note: str,
) -> str | None:
    """
    Kanzler-Label nur für Komplexität ≥ 4. Priorisierte Heuristik aus Note + Spielverlauf.
    """
    complexity = int(_num(game_state.get("complexity"), 1))
    if complexity < 4:
        return None

    stab = _bilanz_qualitativ(game_state, "stabilitaet") or "stabil"
    reform = _bilanz_qualitativ(game_state, "reformTiefe") or "mittel"
    medien = _bilanz_qualitativ(game_state, "medienbilanz") or "gemischt"

    gesetze_n = sum(
        1
        for g in (game_state.get("gesetze") or [])
        if isinstance(g, dict) and g.get("status") == "beschlossen"
    )
    spread = _milieu_spread(game_state)
    bruch = game_state.get("koalitionsbruchSeitMonat") is not None
    skandale = int(_num(game_state.get("skandaleGesamt")))

    if urteil_note == "F":
        return "Gescheitert"
    if bruch or stab == "krise":
        return "Krisenkanzler/in"
    if spread >= 40:
        return "Polarisierer/in"
    if medien == "schlecht" and (
        _bool(game_state.get("extremismusWarnung")) or skandale >= 3
    ):
        return "Populist/in"
    if urteil_note in ("A", "B") and reform == "tief":
        return "Reformkanzler/in"
    if urteil_note in ("A", "B") and gesetze_n >= 7:
        return "Gestaltungskanzler/in"
    if urteil_note in ("A", "B", "C") and stab == "stabil" and spread < 25:
        return "Stabilitätskanzler/in"
    if urteil_note in ("C", "D") and gesetze_n <= 5:
        return "Verwalter/in"
    if urteil_note in ("A", "B"):
        return "Gestaltungskanzler/in"
    if urteil_note == "C":
        return "Stabilitätskanzler/in"
    return "Verwalter/in"


def apply_historisches_urteil_zu_bilanz(
    game_state: dict[str, Any],
    gesetze_content: list[dict[str, Any]],
) -> dict[str, Any]:
    """Mutiert game_state['legislaturBilanz'] um historisches Urteil + Archetyp."""
    gs = game_state
    raw_bilanz = gs.get("legislaturBilanz")
    bilanz: dict[str, Any] = (
        {}
        if raw_bilanz is None or not isinstance(raw_bilanz, dict)
        else dict(raw_bilanz)
    )

    urteil = berechne_historisches_urteil(gs, gesetze_content)
    archetyp = ermittle_kanzler_archetyp(gs, urteil["historischesUrteilNote"])

    bilanz["historischesUrteilPunkte"] = urteil["historischesUrteilPunkte"]
    bilanz["historischesUrteilNote"] = urteil["historischesUrteilNote"]
    bilanz["historischesUrteilRohscore"] = urteil["historischesUrteilRohscore"]
    bilanz["historischesUrteilDetail"] = urteil["historischesUrteilDetail"]
    bilanz["langzeitwirkungenPositiv"] = urteil["langzeitwirkungenPositiv"]
    bilanz["langzeitwirkungenNegativ"] = urteil["langzeitwirkungenNegativ"]
    bilanz["kanzlerArchetypLabel"] = archetyp

    gs["legislaturBilanz"] = bilanz
    return gs
