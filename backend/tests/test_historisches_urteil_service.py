"""Tests SMA-507 historisches_urteil_service (ohne DB)."""

from app.services.historisches_urteil_service import (
    berechne_historisches_urteil,
    collect_negative_effects,
    collect_positive_effects,
    ermittle_kanzler_archetyp,
)


def _content() -> list[dict]:
    return [
        {
            "id": "g1",
            "langzeit_score": 10,
            "langzeitwirkung_positiv": ["A", "B", "A"],
            "langzeitwirkung_negativ": ["X"],
        },
        {
            "id": "g2",
            "langzeit_score": 5,
            "langzeitwirkung_positiv": ["C"],
            "langzeitwirkung_negativ": ["Y", "X"],
        },
    ]


def test_collect_effects_dedup_order():
    by = {r["id"]: r for r in _content()}
    pos = collect_positive_effects(["g1", "g2"], by)
    neg = collect_negative_effects(["g1", "g2"], by)
    assert pos == ["A", "B", "C"]
    assert neg == ["X", "Y"]


def test_berechne_historisches_urteil_summe_und_haushalt():
    gs = {
        "gesetze": [
            {"id": "g1", "status": "beschlossen"},
            {"id": "g2", "status": "beschlossen"},
        ],
        "haushalt": {"saldoKumulativ": 5},
        "milieuZustimmung": {"a": 50, "b": 73},
        "verfassungsgerichtAktiv": False,
        "extremismusWarnung": False,
    }
    r = berechne_historisches_urteil(gs, _content())
    assert r["historischesUrteilDetail"]["langzeitScoreSumme"] == 15
    assert r["historischesUrteilDetail"]["haushaltNachhaltigkeit"] == 5
    assert r["historischesUrteilDetail"]["gesellschaftsStabilitaet"] == 5
    assert r["historischesUrteilDetail"]["institutionenIntegritaet"] == 3
    roh = 15 + 5 + 5 + 3
    assert r["historischesUrteilRohscore"] == roh
    assert r["historischesUrteilPunkte"] == roh
    assert r["historischesUrteilNote"] == "D"


def test_institutionen_verfassungsgericht_vorrang():
    gs = {
        "gesetze": [],
        "haushalt": {"saldoKumulativ": 0},
        "milieuZustimmung": {"a": 50, "b": 55},
        "verfassungsgerichtAktiv": True,
        "extremismusWarnung": True,
    }
    r = berechne_historisches_urteil(gs, [])
    assert r["historischesUrteilDetail"]["institutionenIntegritaet"] == -10


def test_note_schwellen_wie_bilanz():
    gs_min = {
        "gesetze": [],
        "haushalt": {"saldoKumulativ": 0},
        "milieuZustimmung": {"a": 40, "b": 70},
        "verfassungsgerichtAktiv": False,
        "extremismusWarnung": False,
    }
    content = [
        {
            "id": "x",
            "langzeit_score": 70,
            "langzeitwirkung_positiv": [],
            "langzeitwirkung_negativ": [],
        }
    ]
    gs_min["gesetze"] = [{"id": "x", "status": "beschlossen"}]
    r = berechne_historisches_urteil(gs_min, content)
    assert r["historischesUrteilPunkte"] == 80
    assert r["historischesUrteilNote"] == "A"


def test_archetyp_stufe4_nur():
    gs = {
        "complexity": 3,
        "gesetze": [{"id": "g1", "status": "beschlossen"}],
        "legislaturBilanz": {
            "stabilitaet": "stabil",
            "reformTiefe": "tief",
            "medienbilanz": "gut",
        },
    }
    assert ermittle_kanzler_archetyp(gs, "A") is None


def test_archetyp_gescheitert():
    gs = {
        "complexity": 4,
        "gesetze": [],
        "legislaturBilanz": {},
        "milieuZustimmung": {"a": 50, "b": 55},
    }
    assert ermittle_kanzler_archetyp(gs, "F") == "Gescheitert"


def test_archetyp_reformkanzler():
    gs = {
        "complexity": 4,
        "gesetze": [{"id": "g1", "status": "beschlossen"}] * 8,
        "legislaturBilanz": {
            "stabilitaet": "stabil",
            "reformTiefe": "tief",
            "medienbilanz": "gut",
        },
        "milieuZustimmung": {"a": 50, "b": 55},
    }
    assert ermittle_kanzler_archetyp(gs, "A") == "Reformkanzler/in"
