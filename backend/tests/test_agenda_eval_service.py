"""Unit-Tests für SMA-506 agenda_eval_service (ohne DB)."""

from app.services.agenda_eval_service import (
    apply_agenda_am_spielende,
    evaluate_koalitions_ziel,
    evaluate_spieler_ziel,
)


def test_evaluate_spieler_gesetz_politikfeld():
    gs = {
        "gesetze": [
            {"status": "beschlossen", "politikfeldId": "umwelt_energie"},
            {"status": "eingebracht", "politikfeldId": "umwelt_energie"},
        ],
    }
    z = {
        "id": "t",
        "bedingung_typ": "gesetz_politikfeld",
        "bedingung_param": {"politikfeld_id": "umwelt_energie", "min_beschlossen": 1},
    }
    assert evaluate_spieler_ziel(gs, z) is True


def test_evaluate_spieler_milieu_min_uses_history():
    gs = {
        "milieuZustimmung": {"soziale_mitte": 40},
        "milieuHistory": {
            "soziale_mitte": {"min": 50, "max": 55, "sum": 500, "months": 10},
        },
    }
    z = {
        "id": "m",
        "bedingung_typ": "milieu_zustimmung_min",
        "bedingung_param": {"milieu_id": "soziale_mitte", "min_pct": 48},
    }
    assert evaluate_spieler_ziel(gs, z) is True


def test_note_from_ratio_and_koalition_malus():
    agenda_ziele = [
        {
            "id": "a1",
            "bedingung_typ": "gesetz_anzahl_beschlossen",
            "bedingung_param": {"min_beschlossen": 0},
        },
        {
            "id": "a2",
            "bedingung_typ": "gesetz_anzahl_beschlossen",
            "bedingung_param": {"min_beschlossen": 99},
        },
    ]
    kz = [
        {
            "id": "kz1",
            "partner_profil": "gp",
            "bedingung_typ": "gesetz_politikfeld",
            "bedingung_param": {"politikfeld_id": "umwelt_energie", "min_beschlossen": 5},
            "beziehung_malus": 8,
            "titel": "Test-Ziel",
        },
    ]
    gs = {
        "spielerAgenda": ["a1", "a2"],
        "koalitionsAgenda": ["kz1"],
        "gesetze": [],
        "koalitionspartner": {"id": "gp", "beziehung": 60},
        "legislaturBilanz": {},
    }
    r = apply_agenda_am_spielende(gs, agenda_ziele, kz, locale="de")
    assert r.spieler_gesamt == 2
    assert r.spieler_erfuellt == 1
    assert r.spieler_note == "C"
    assert r.koalition_beziehung_delta == -8
    assert r.game_state["koalitionspartner"]["beziehung"] == 52
    bilanz = r.game_state["legislaturBilanz"]
    assert bilanz["agendaEvalApplied"] is True
    assert bilanz["agendaKoalitionVerfehlt"][0]["id"] == "kz1"
    assert "Koalitionsziel verfehlt" in bilanz["agendaKoalitionBilanzTexte"][0]


def test_idempotent_second_apply():
    agenda_ziele = [
        {
            "id": "a1",
            "bedingung_typ": "gesetz_anzahl_beschlossen",
            "bedingung_param": {"min_beschlossen": 0},
        },
    ]
    gs = {
        "spielerAgenda": ["a1"],
        "koalitionsAgenda": [],
        "gesetze": [],
        "legislaturBilanz": {},
    }
    r1 = apply_agenda_am_spielende(gs, agenda_ziele, [])
    r2 = apply_agenda_am_spielende(r1.game_state, agenda_ziele, [])
    assert r2.already_applied is True
    assert r2.koalition_beziehung_delta == 0


def test_koalitionsbeziehung_min():
    gs = {
        "koalitionspartner": {"id": "gp", "beziehung": 55},
    }
    z = {
        "id": "k",
        "partner_profil": "gp",
        "bedingung_typ": "koalitionsbeziehung_min",
        "bedingung_param": {"min_beziehung": 50},
    }
    assert evaluate_koalitions_ziel(gs, z) is True
