"""
SMA-506: Agenda- und Koalitionsziel-Auswertung am Spielende (serverseitig).

Logik spiegelt frontend/src/core/agendaTracking.ts und constants AGENDA_TRACKING_*.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Wie frontend/src/core/constants.ts
AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE = 45


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


def _note_from_ratio(ratio: float) -> str:
    if ratio >= 0.9:
        return "A"
    if ratio >= 0.7:
        return "B"
    if ratio >= 0.5:
        return "C"
    if ratio >= 0.3:
        return "D"
    return "F"


def _count_beschlossen_politikfeld(gs: dict[str, Any], politikfeld_id: str) -> int:
    n = 0
    for g in gs.get("gesetze") or []:
        if not isinstance(g, dict):
            continue
        if (
            g.get("status") == "beschlossen"
            and g.get("politikfeldId") == politikfeld_id
        ):
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
    below = 0
    if avg < schwelle:
        below = months
    elif beziehung < schwelle:
        below = 1
    return below


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


def evaluate_spieler_ziel(gs: dict[str, Any], z: dict[str, Any]) -> bool:
    typ = _str(z.get("bedingung_typ"))
    p = z.get("bedingung_param")
    param: dict[str, Any] = p if isinstance(p, dict) else {}

    if typ == "gesetz_anzahl_beschlossen":
        target = max(0, round(_num(param.get("min_beschlossen"))))
        return _count_beschlossen_gesamt(gs) >= target
    if typ == "gesetz_politikfeld":
        pf = _str(param.get("politikfeld_id"))
        target = max(0, round(_num(param.get("min_beschlossen"))))
        return _count_beschlossen_politikfeld(gs, pf) >= target
    if typ == "milieu_zustimmung_min":
        milieu_id = _str(param.get("milieu_id"))
        min_pct = _num(param.get("min_pct"))
        return _milieu_min_legislatur(gs, milieu_id) >= min_pct
    if typ == "medienklima_monate_min":
        schwelle = _num(param.get("schwelle"), 55.0)
        target = max(0, round(_num(param.get("min_monate"))))
        return _count_medien_monate_ueber_schwelle(gs, schwelle) >= target
    if typ == "medienklima_monate_max_unter":
        schwelle = _num(param.get("schwelle"), 35.0)
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = int(_num(gs.get("medienklimaBelowMonths")))
        return current <= max_monate
    if typ == "verband_beziehung_min":
        vid = _str(param.get("verband_id"))
        min_bez = _num(param.get("min_beziehung"))
        vb = gs.get("verbandsBeziehungen")
        vb_rel = _num(vb.get(vid)) if isinstance(vb, dict) else 0.0
        return vb_rel >= min_bez
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
        return current >= streak_needed
    if typ == "gesetz_investiv_beschlossen":
        target = max(0, round(_num(param.get("min_beschlossen"))))
        return _count_beschlossen_investiv(gs) >= target
    if typ == "char_mood_min_durchschnitt":
        min_avg_mood = _num(param.get("min_avg_mood"), 3.0)
        avg_mood = _durchschnitt_kabinetts_mood(gs)
        return avg_mood >= min_avg_mood - 1e-6
    return False


def evaluate_koalitions_ziel(gs: dict[str, Any], z: dict[str, Any]) -> bool:
    typ = _str(z.get("bedingung_typ"))
    p = z.get("bedingung_param")
    param: dict[str, Any] = p if isinstance(p, dict) else {}
    partner = _str(z.get("partner_profil"))

    if typ == "gesetz_politikfeld":
        pf = _str(param.get("politikfeld_id"))
        target = max(0, round(_num(param.get("min_beschlossen"))))
        return _count_beschlossen_politikfeld(gs, pf) >= target
    if typ == "milieu_zustimmung_min":
        milieu_id = _str(param.get("milieu_id"))
        min_pct_k = _num(param.get("min_pct"))
        return _milieu_min_legislatur(gs, milieu_id) >= min_pct_k
    if typ == "verband_beziehung_min":
        vid = _str(param.get("verband_id"))
        min_bez_k = _num(param.get("min_beziehung"))
        vb = gs.get("verbandsBeziehungen")
        vb_rel_k = _num(vb.get(vid)) if isinstance(vb, dict) else 0.0
        return vb_rel_k >= min_bez_k
    if typ == "koalitionsbeziehung_min":
        schwelle = _num(param.get("min_beziehung"))
        kp = gs.get("koalitionspartner")
        if not isinstance(kp, dict) or kp.get("id") != partner:
            return False
        return _num(kp.get("beziehung")) >= schwelle
    if typ == "koalitionsbeziehung_monate_unter":
        schwelle = _num(param.get("schwelle"))
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = _monate_koalitionsbeziehung_unter(gs, partner, schwelle)
        return current <= max_monate
    if typ == "char_mood_schlecht_max":
        max_sum = max(0, round(_num(param.get("max_summe_monate"))))
        pro_char = max(1, round(_num(param.get("pro_char_max"), 6.0)))
        current = _monate_char_mood_schlecht(gs, pro_char)
        return current <= max_sum
    if typ == "medienklima_monate_max_unter":
        schwelle = _num(
            param.get("schwelle"), float(AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE)
        )
        max_monate = max(0, round(_num(param.get("max_monate"))))
        current = int(_num(gs.get("medienklimaBelowMonths")))
        return current <= max_monate
    return False


@dataclass
class AgendaEvalApplyResult:
    game_state: dict[str, Any]
    spieler_erfuellt: int = 0
    spieler_gesamt: int = 0
    spieler_note: str = "F"
    koalition_verfehlt: list[dict[str, Any]] = field(default_factory=list)
    koalition_beziehung_delta: int = 0
    already_applied: bool = False


def _by_id(items: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    m: dict[str, dict[str, Any]] = {}
    for x in items or []:
        if isinstance(x, dict) and isinstance(x.get("id"), str):
            m[x["id"]] = x
    return m


def apply_agenda_am_spielende(
    game_state: dict[str, Any],
    agenda_ziele: list[dict[str, Any]],
    koalitions_ziele: list[dict[str, Any]],
    *,
    locale: str = "de",
) -> AgendaEvalApplyResult:
    """
    Wertet Spieler- und Koalitions-Agenda aus, schreibt Bilanz-Felder und wendet Koalitions-Malus an.
    """
    gs = dict(game_state)
    prev_bilanz = gs.get("legislaturBilanz")
    if isinstance(prev_bilanz, dict) and prev_bilanz.get("agendaEvalApplied") is True:
        raw_miss = prev_bilanz.get("agendaKoalitionVerfehlt")
        wieder: list[dict[str, Any]] = []
        if isinstance(raw_miss, list):
            for item in raw_miss:
                if isinstance(item, dict) and isinstance(item.get("id"), str):
                    wieder.append(
                        {
                            "id": item["id"],
                            "titel": _str(item.get("titel"), item["id"]),
                            "beziehung_malus": int(_num(item.get("beziehung_malus"))),
                        }
                    )
        return AgendaEvalApplyResult(
            game_state=gs,
            spieler_erfuellt=int(_num(prev_bilanz.get("agendaSpielerErfuellt"))),
            spieler_gesamt=int(_num(prev_bilanz.get("agendaSpielerGesamt"))),
            spieler_note=str(prev_bilanz.get("agendaSpielerNote") or "F"),
            koalition_verfehlt=wieder,
            koalition_beziehung_delta=0,
            already_applied=True,
        )
    spieler_ids = gs.get("spielerAgenda")
    koa_ids = gs.get("koalitionsAgenda")
    if not isinstance(spieler_ids, list):
        spieler_ids = []
    if not isinstance(koa_ids, list):
        koa_ids = []

    az = _by_id(agenda_ziele)
    kz = _by_id(koalitions_ziele)

    spieler_erfuellt = 0
    spieler_gesamt = 0
    for aid in spieler_ids:
        if not isinstance(aid, str):
            continue
        z = az.get(aid)
        if not z:
            continue
        spieler_gesamt += 1
        if evaluate_spieler_ziel(gs, z):
            spieler_erfuellt += 1

    ratio = spieler_erfuellt / spieler_gesamt if spieler_gesamt else 0.0
    spieler_note = _note_from_ratio(ratio)

    koalition_verfehlt: list[dict[str, Any]] = []
    total_malus = 0
    bilanz_zeilen: list[str] = []

    for kid in koa_ids:
        if not isinstance(kid, str):
            continue
        z = kz.get(kid)
        if not z:
            continue
        if evaluate_koalitions_ziel(gs, z):
            continue
        malus = int(_num(z.get("beziehung_malus")))
        total_malus += malus
        titel = _str(z.get("titel"), kid)
        koalition_verfehlt.append(
            {
                "id": kid,
                "titel": titel,
                "beziehung_malus": malus,
            }
        )
        if locale == "de":
            bilanz_zeilen.append(
                f"Koalitionsziel verfehlt ({titel}): Beziehung −{malus}."
            )
        else:
            bilanz_zeilen.append(
                f"Coalition goal missed ({titel}): relationship −{malus}."
            )

    if total_malus > 0:
        kp = gs.get("koalitionspartner")
        if isinstance(kp, dict):
            neu = max(0, min(100, int(_num(kp.get("beziehung"))) - total_malus))
            gs["koalitionspartner"] = {**kp, "beziehung": neu}

    raw_bilanz = gs.get("legislaturBilanz")
    bilanz: dict[str, Any] = (
        {}
        if raw_bilanz is None or not isinstance(raw_bilanz, dict)
        else dict(raw_bilanz)
    )

    bilanz["agendaSpielerErfuellt"] = spieler_erfuellt
    bilanz["agendaSpielerGesamt"] = spieler_gesamt
    bilanz["agendaSpielerNote"] = spieler_note
    bilanz["agendaKoalitionVerfehlt"] = koalition_verfehlt
    bilanz["agendaEvalApplied"] = True
    if bilanz_zeilen:
        existing = bilanz.get("agendaKoalitionBilanzTexte")
        if isinstance(existing, list):
            merged = [str(x) for x in existing if isinstance(x, str)] + bilanz_zeilen
        else:
            merged = bilanz_zeilen
        bilanz["agendaKoalitionBilanzTexte"] = merged

    gs["legislaturBilanz"] = bilanz

    return AgendaEvalApplyResult(
        game_state=gs,
        spieler_erfuellt=spieler_erfuellt,
        spieler_gesamt=spieler_gesamt,
        spieler_note=spieler_note,
        koalition_verfehlt=koalition_verfehlt,
        koalition_beziehung_delta=-total_malus,
    )
