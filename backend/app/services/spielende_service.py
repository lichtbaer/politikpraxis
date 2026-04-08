"""
SMA-508: Gesamtnote & Spielende-Payload (serverseitig).

Gewichtung: Bilanz 30 %, Agenda 35 %, Historisches Urteil 35 %.
Wiederwahl-Bonus auf die Gesamtpunkte (0–100): +0,3 bei Sieg, −0,1 bei Niederlage.

Noten-Skala: A+, A, A-, B+, B, B-, C+, C, C-, D, F

Komplexität: Stufe 1 nur Wiederwahl; 2 + Bilanz/Agenda; 3 + Urteil/Gesamtnote; 4 + Kanzler-Archetyp.
"""

from __future__ import annotations

from typing import Any

from app.services.agenda_eval_service import AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE
from app.services.historisches_urteil_service import (
    berechne_historisches_urteil,
    ermittle_kanzler_archetyp,
)

GEWICHT_BILANZ = 0.3
GEWICHT_AGENDA = 0.35
GEWICHT_URTEIL = 0.35

WAHLBONUS_SIEG = 0.3
WAHLBONUS_NIEDERLAGE = -0.1

# Wie frontend/src/core/spielziel.ts — Ampel → 0–100
_AMPEL_SCORE = {"green": 100, "yellow": 55, "red": 15}


def _num(raw: Any, fallback: float = 0.0) -> float:
    if isinstance(raw, bool):
        return float(fallback)
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        return float(raw)
    except (TypeError, ValueError):
        return fallback


def _str(raw: Any, fallback: str = "") -> str:
    return raw if isinstance(raw, str) else fallback


def _pct_margin(target: float) -> float:
    return max(2.0, round(target * 0.04))


def _ampel_higher_is_better(value: float, target: float) -> str:
    if value >= target:
        return "green"
    m = _pct_margin(target)
    if value >= target - m:
        return "yellow"
    return "red"


def _ampel_lower_is_better(value: float, max_v: float) -> str:
    if value <= max_v:
        return "green"
    m = max(1.0, round(max_v * 0.25))
    if value <= max_v + m:
        return "yellow"
    return "red"


def _ampel_count_towards_target(current: int, target: int) -> str:
    if current >= target:
        return "green"
    if target > 0 and current == target - 1:
        return "yellow"
    return "red"


def _count_beschlossen_politikfeld(gs: dict[str, Any], politikfeld_id: str) -> int:
    n = 0
    for g in gs.get("gesetze") or []:
        if not isinstance(g, dict):
            continue
        if g.get("status") == "beschlossen" and g.get("politikfeldId") == politikfeld_id:
            n += 1
    return n


def _count_beschlossen_gesamt(gs: dict[str, Any]) -> int:
    return sum(
        1
        for g in (gs.get("gesetze") or [])
        if isinstance(g, dict) and g.get("status") == "beschlossen"
    )


def _count_beschlossen_investiv(gs: dict[str, Any]) -> int:
    n = 0
    for g in gs.get("gesetze") or []:
        if not isinstance(g, dict):
            continue
        if g.get("status") == "beschlossen" and g.get("investiv"):
            n += 1
    return n


def _milieu_aktuell(gs: dict[str, Any], milieu_id: str) -> float:
    z = gs.get("milieuZustimmung")
    if isinstance(z, dict) and milieu_id in z:
        return _num(z.get(milieu_id))
    return 0.0


def _milieu_min_legislatur(gs: dict[str, Any], milieu_id: str) -> float:
    h = gs.get("milieuHistory")
    if isinstance(h, dict):
        cur = h.get(milieu_id)
        if isinstance(cur, dict):
            months = int(_num(cur.get("months")))
            if months > 0:
                return _num(cur.get("min"))
    return _milieu_aktuell(gs, milieu_id)


def _count_medien_monate_ueber_schwelle(gs: dict[str, Any], schwelle: float) -> int:
    hist = gs.get("medienKlimaHistory")
    if not isinstance(hist, list):
        return 0
    return sum(1 for v in hist if isinstance(v, (int, float)) and float(v) >= schwelle)


def _longest_haushalt_saldo_streak(
    history: list[float], min_saldo: float, up_to_length: int
) -> int:
    if not history:
        return 0
    best = 0
    cur = 0
    slice_ = history[-up_to_length:] if len(history) > up_to_length else history
    for saldo in slice_:
        if saldo >= min_saldo:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best


def _durchschnitt_kabinetts_mood(gs: dict[str, Any]) -> float:
    chars = gs.get("chars")
    if not isinstance(chars, list) or not chars:
        return 0.0
    total = 0.0
    n = 0
    for c in chars:
        if isinstance(c, dict) and "mood" in c:
            total += _num(c.get("mood"))
            n += 1
    return total / n if n else 0.0


def _monate_koalitionsbeziehung_unter(
    gs: dict[str, Any], partner_profil: str, schwelle: float
) -> int:
    kp = gs.get("koalitionspartner")
    if not isinstance(kp, dict) or kp.get("id") != partner_profil:
        return 0
    beziehung = _num(kp.get("beziehung"))
    leg = gs.get("koalitionsbeziehungLegislatur")
    if not isinstance(leg, dict) or _num(leg.get("months")) < 1:
        return 1 if beziehung < schwelle else 0
    months = int(_num(leg.get("months")))
    sum_b = _num(leg.get("sum"))
    avg = sum_b / months if months else beziehung
    if avg < schwelle:
        return months
    if beziehung < schwelle:
        return 1
    return 0


def _monate_char_mood_schlecht(gs: dict[str, Any], min_schlecht_pro_char: int) -> int:
    hist = gs.get("charMoodHistory")
    if not isinstance(hist, dict):
        hist = {}
    chars = gs.get("chars")
    if not isinstance(chars, list):
        return 0
    total = 0
    for c in chars:
        if not isinstance(c, dict):
            continue
        cid = c.get("id")
        if not isinstance(cid, str):
            continue
        raw = hist.get(cid, 0)
        try:
            cnt = int(raw) if isinstance(raw, (int, float)) else int(_num(raw))
        except (TypeError, ValueError):
            cnt = 0
        total += min(cnt, min_schlecht_pro_char)
    return total


def _spieler_ziel_ampel(gs: dict[str, Any], z: dict[str, Any]) -> str:
    typ = _str(z.get("bedingung_typ"))
    p = z.get("bedingung_param")
    param: dict[str, Any] = p if isinstance(p, dict) else {}

    if typ == "gesetz_anzahl_beschlossen":
        target = max(0, round(_num(param.get("min_beschlossen"))))
        current = _count_beschlossen_gesamt(gs)
        return _ampel_count_towards_target(current, target)
    if typ == "gesetz_politikfeld":
        pf = _str(param.get("politikfeld_id"))
        target = max(0, round(_num(param.get("min_beschlossen"))))
        current = _count_beschlossen_politikfeld(gs, pf)
        return _ampel_count_towards_target(current, target)
    if typ == "milieu_zustimmung_min":
        milieu_id = _str(param.get("milieu_id"))
        target = _num(param.get("min_pct"))
        current = _milieu_aktuell(gs, milieu_id)
        return _ampel_higher_is_better(current, target)
    if typ == "medienklima_monate_min":
        schwelle = _num(param.get("schwelle"), 55.0)
        target = max(0, round(_num(param.get("min_monate"))))
        current = _count_medien_monate_ueber_schwelle(gs, schwelle)
        return _ampel_count_towards_target(current, target)
    if typ == "medienklima_monate_max_unter":
        schwelle = _num(param.get("schwelle"), 35.0)
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = int(_num(gs.get("medienklimaBelowMonths")))
        return _ampel_lower_is_better(current, max_monate)
    if typ == "verband_beziehung_min":
        vid = _str(param.get("verband_id"))
        target = _num(param.get("min_beziehung"))
        vb = gs.get("verbandsBeziehungen")
        current = _num(vb.get(vid)) if isinstance(vb, dict) else 0.0
        return _ampel_higher_is_better(current, target)
    if typ == "haushalt_saldo_min":
        min_saldo = _num(param.get("min_saldo_mrd"))
        streak_needed = max(1, round(_num(param.get("min_monate_am_stueck"), 12.0)))
        hh = gs.get("haushaltSaldoHistory")
        hist: list[float] = []
        if isinstance(hh, list):
            for x in hh:
                if isinstance(x, (int, float)):
                    hist.append(float(x))
        current = _longest_haushalt_saldo_streak(hist, min_saldo, streak_needed + 24)
        return _ampel_count_towards_target(current, streak_needed)
    if typ == "gesetz_investiv_beschlossen":
        target = max(0, round(_num(param.get("min_beschlossen"))))
        current = _count_beschlossen_investiv(gs)
        return _ampel_count_towards_target(current, target)
    if typ == "char_mood_min_durchschnitt":
        min_avg_mood = _num(param.get("min_avg_mood"), 3.0)
        current = _durchschnitt_kabinetts_mood(gs)
        rounded = round(current * 10) / 10
        return _ampel_higher_is_better(rounded, min_avg_mood)
    return "yellow"


def _koalitions_ziel_ampel(gs: dict[str, Any], z: dict[str, Any]) -> str:
    typ = _str(z.get("bedingung_typ"))
    p = z.get("bedingung_param")
    param: dict[str, Any] = p if isinstance(p, dict) else {}
    partner = _str(z.get("partner_profil"))

    if typ == "gesetz_politikfeld":
        pf = _str(param.get("politikfeld_id"))
        target = max(0, round(_num(param.get("min_beschlossen"))))
        current = _count_beschlossen_politikfeld(gs, pf)
        return _ampel_count_towards_target(current, target)
    if typ == "milieu_zustimmung_min":
        milieu_id = _str(param.get("milieu_id"))
        target = _num(param.get("min_pct"))
        current = _milieu_aktuell(gs, milieu_id)
        return _ampel_higher_is_better(current, target)
    if typ == "verband_beziehung_min":
        vid = _str(param.get("verband_id"))
        target = _num(param.get("min_beziehung"))
        vb = gs.get("verbandsBeziehungen")
        current = _num(vb.get(vid)) if isinstance(vb, dict) else 0.0
        return _ampel_higher_is_better(current, target)
    if typ == "koalitionsbeziehung_min":
        schwelle = _num(param.get("min_beziehung"))
        kp = gs.get("koalitionspartner")
        current = _num(kp.get("beziehung")) if isinstance(kp, dict) and kp.get("id") == partner else 0.0
        return _ampel_higher_is_better(current, schwelle)
    if typ == "koalitionsbeziehung_monate_unter":
        schwelle = _num(param.get("schwelle"))
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = _monate_koalitionsbeziehung_unter(gs, partner, schwelle)
        return _ampel_lower_is_better(current, max_monate)
    if typ == "char_mood_schlecht_max":
        max_sum = max(0, round(_num(param.get("max_summe_monate"))))
        pro_char = max(1, round(_num(param.get("pro_char_max"), 6.0)))
        current = _monate_char_mood_schlecht(gs, pro_char)
        return _ampel_lower_is_better(current, max_sum)
    if typ == "medienklima_monate_max_unter":
        schwelle = _num(param.get("schwelle"), float(AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE))
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = int(_num(gs.get("medienklimaBelowMonths")))
        return _ampel_lower_is_better(current, max_monate)
    return "yellow"


def _by_id(items: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    m: dict[str, dict[str, Any]] = {}
    for x in items or []:
        if isinstance(x, dict) and isinstance(x.get("id"), str):
            m[x["id"]] = x
    return m


def agenda_anteil_punkte(
    gs: dict[str, Any],
    agenda_ziele: list[dict[str, Any]],
    koalitions_ziele: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Wie frontend/src/core/spielziel.ts agendaAnteilPunkte: Mittelwert der Ampel-Scores
    (Spieler- und Koalitions-Agenda), ohne Ziele → 55.
    """
    spieler_ids = gs.get("spielerAgenda")
    koa_ids = gs.get("koalitionsAgenda")
    if not isinstance(spieler_ids, list):
        spieler_ids = []
    if not isinstance(koa_ids, list):
        koa_ids = []

    az = _by_id(agenda_ziele)
    kz = _by_id(koalitions_ziele)

    spieler_scores: list[float] = []
    for aid in spieler_ids:
        if not isinstance(aid, str):
            continue
        z = az.get(aid)
        if not z:
            continue
        ampel = _spieler_ziel_ampel(gs, z)
        spieler_scores.append(float(_AMPEL_SCORE.get(ampel, 55)))

    koalition_scores: list[float] = []
    for kid in koa_ids:
        if not isinstance(kid, str):
            continue
        z = kz.get(kid)
        if not z:
            continue
        ampel = _koalitions_ziel_ampel(gs, z)
        koalition_scores.append(float(_AMPEL_SCORE.get(ampel, 55)))

    a_s = sum(spieler_scores) / len(spieler_scores) if spieler_scores else None
    a_k = sum(koalition_scores) / len(koalition_scores) if koalition_scores else None

    if a_s is not None and a_k is not None:
        punkte = (a_s + a_k) / 2
    elif a_s is not None:
        punkte = a_s
    elif a_k is not None:
        punkte = a_k
    else:
        punkte = 55.0

    punkte_i = int(max(0, min(100, round(punkte))))
    return {
        "punkte": punkte_i,
        "spieler_ziele_gewertet": len(spieler_scores),
        "koalition_ziele_gewertet": len(koalition_scores),
    }


def _note_from_score_mit_plusminus(score: float) -> str:
    s = max(0.0, min(100.0, score))
    if s >= 97:
        return "A+"
    if s >= 93:
        return "A"
    if s >= 90:
        return "A-"
    if s >= 87:
        return "B+"
    if s >= 83:
        return "B"
    if s >= 80:
        return "B-"
    if s >= 77:
        return "C+"
    if s >= 73:
        return "C"
    if s >= 70:
        return "C-"
    if s >= 60:
        return "D"
    return "F"


def berechne_wiederwahl_bonus_punkte(gs: dict[str, Any]) -> float:
    """+0,3 bei Sieg (won), −0,1 bei Niederlage; fehlendes won → Fallback wahlUeberHuerde."""
    won = gs.get("won")
    if won is True:
        return WAHLBONUS_SIEG
    if won is False:
        return WAHLBONUS_NIEDERLAGE
    if gs.get("wahlUeberHuerde") is True:
        return WAHLBONUS_SIEG
    if gs.get("wahlUeberHuerde") is False:
        return WAHLBONUS_NIEDERLAGE
    return 0.0


def berechne_gesamtnote(
    game_state: dict[str, Any],
    gesetze_content: list[dict[str, Any]],
    agenda_ziele: list[dict[str, Any]],
    koalitions_ziele: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Liefert Bilanz-, Agenda- und Urteil-Punkte, gewichtete Basis, Wahl-Bonus und Gesamtnote.
    Nutzt historisches Urteil aus historisches_urteil_service (gleiche Punkte wie in der Bilanz).
    """
    gs = game_state
    bilanz = gs.get("legislaturBilanz")
    bilanz_punkte = 0
    bilanz_note: str | None = None
    if isinstance(bilanz, dict):
        bilanz_punkte = int(max(0, min(100, round(_num(bilanz.get("bilanzPunkte"))))))
        bn = bilanz.get("bilanzNote")
        if isinstance(bn, str):
            bilanz_note = bn

    agenda = agenda_anteil_punkte(gs, agenda_ziele, koalitions_ziele)
    agenda_punkte = int(agenda["punkte"])

    urteil = berechne_historisches_urteil(gs, gesetze_content)
    urteil_punkte = int(urteil["historischesUrteilPunkte"])
    urteil_note = str(urteil["historischesUrteilNote"])

    basis = GEWICHT_BILANZ * bilanz_punkte + GEWICHT_AGENDA * agenda_punkte + GEWICHT_URTEIL * urteil_punkte
    basis_rund = max(0.0, min(100.0, round(basis)))

    wahl_delta = berechne_wiederwahl_bonus_punkte(gs)
    gesamt_raw = basis_rund + wahl_delta
    gesamtpunkte = max(0.0, min(100.0, round(gesamt_raw * 10) / 10))
    gesamtnote = _note_from_score_mit_plusminus(gesamtpunkte)

    return {
        "bilanzPunkte": bilanz_punkte,
        "bilanzNote": bilanz_note,
        "agendaPunkte": agenda_punkte,
        "agendaDetail": {
            "spielerZieleGewertet": agenda["spieler_ziele_gewertet"],
            "koalitionZieleGewertet": agenda["koalition_ziele_gewertet"],
        },
        "urteilPunkte": urteil_punkte,
        "urteilNote": urteil_note,
        "gewichteteBasisPunkte": basis_rund,
        "wahlBonusPunkte": wahl_delta,
        "gesamtpunkte": gesamtpunkte,
        "gesamtnote": gesamtnote,
        "historischesUrteil": urteil,
    }


def build_spielende_response(
    game_state: dict[str, Any],
    gesetze_content: list[dict[str, Any]],
    agenda_ziele: list[dict[str, Any]],
    koalitions_ziele: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    JSON für GET /api/game/{id}/spielende — abhängig von complexity (1–4).
    """
    gs = game_state
    complexity = int(_num(gs.get("complexity"), 1))
    complexity = max(1, min(4, complexity))

    zust = gs.get("zust")
    zust_g = _num(zust.get("g")) if isinstance(zust, dict) else _num(gs.get("zustimmung"))

    wahlergebnis_raw = gs.get("wahlergebnis")
    prognose_raw = gs.get("wahlprognose")
    wahlergebnis = (
        _num(wahlergebnis_raw)
        if wahlergebnis_raw is not None
        else (_num(prognose_raw) if prognose_raw is not None else zust_g)
    )

    threshold = _num(gs.get("electionThreshold"), 40.0)
    won = gs.get("won")
    wahl_ueber = gs.get("wahlUeberHuerde")
    if wahl_ueber is None and isinstance(won, bool):
        wahl_ueber = won

    wiederwahl = {
        "won": bool(won) if isinstance(won, bool) else None,
        "wahlUeberHuerde": bool(wahl_ueber) if isinstance(wahl_ueber, bool) else None,
        "wahlergebnis": round(wahlergebnis, 2),
        "wahlhuerde": round(threshold, 2),
    }

    out: dict[str, Any] = {
        "complexity": complexity,
        "wiederwahl": wiederwahl,
    }

    if complexity < 2:
        return out

    bilanz = gs.get("legislaturBilanz")
    bilanz_punkte = 0
    bilanz_note = None
    if isinstance(bilanz, dict):
        bilanz_punkte = int(max(0, min(100, round(_num(bilanz.get("bilanzPunkte"))))))
        bn = bilanz.get("bilanzNote")
        bilanz_note = bn if isinstance(bn, str) else None

    agenda = agenda_anteil_punkte(gs, agenda_ziele, koalitions_ziele)
    out["bilanz"] = {"punkte": bilanz_punkte, "note": bilanz_note}
    out["agenda"] = {
        "punkte": int(agenda["punkte"]),
        "spielerZieleGewertet": int(agenda["spieler_ziele_gewertet"]),
        "koalitionZieleGewertet": int(agenda["koalition_ziele_gewertet"]),
    }

    if complexity < 3:
        return out

    gn = berechne_gesamtnote(gs, gesetze_content, agenda_ziele, koalitions_ziele)
    out["historischesUrteil"] = {
        "punkte": gn["urteilPunkte"],
        "note": gn["urteilNote"],
        "detail": gn["historischesUrteil"].get("historischesUrteilDetail"),
    }
    out["gesamt"] = {
        "punkte": float(gn["gesamtpunkte"]),
        "note": str(gn["gesamtnote"]),
        "gewichteteBasisPunkte": float(gn["gewichteteBasisPunkte"]),
        "wahlBonusPunkte": float(gn["wahlBonusPunkte"]),
        "anteile": {
            "bilanz": GEWICHT_BILANZ,
            "agenda": GEWICHT_AGENDA,
            "historischesUrteil": GEWICHT_URTEIL,
        },
    }

    if complexity < 4:
        return out

    archetyp = ermittle_kanzler_archetyp(gs, gn["urteilNote"])
    out["kanzlerArchetyp"] = archetyp
    return out
