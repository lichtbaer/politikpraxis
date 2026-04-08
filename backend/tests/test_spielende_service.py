"""Unit-Tests für SMA-508 spielende_service (ohne DB)."""

from app.services.spielende_service import (
    berechne_gesamtnote,
    berechne_wiederwahl_bonus_punkte,
    build_spielende_response,
)


def _minimal_gs(**kwargs):
    base = {
        "gameOver": True,
        "month": 49,
        "complexity": 3,
        "won": True,
        "wahlergebnis": 45.0,
        "electionThreshold": 40.0,
        "spielerAgenda": [],
        "koalitionsAgenda": [],
        "gesetze": [],
        "legislaturBilanz": {"bilanzPunkte": 80, "bilanzNote": "B"},
    }
    base.update(kwargs)
    return base


def test_wahlbonus_sieg_und_niederlage():
    assert berechne_wiederwahl_bonus_punkte({"won": True}) == 0.3
    assert berechne_wiederwahl_bonus_punkte({"won": False}) == -0.1
    assert berechne_wiederwahl_bonus_punkte({"won": None, "wahlUeberHuerde": True}) == 0.3


def test_build_spielende_stufe1_nur_wiederwahl():
    gs = _minimal_gs(complexity=1, won=True)
    out = build_spielende_response(gs, [], [], [])
    assert out["complexity"] == 1
    assert "bilanz" not in out
    assert out["wiederwahl"]["won"] is True
    assert out["wiederwahl"]["wahlergebnis"] == 45.0


def test_build_spielende_stufe3_gesamtnote_mit_gewichtung():
    gs = _minimal_gs(complexity=3)
    out = build_spielende_response(gs, [], [], [])
    assert out["bilanz"]["punkte"] == 80
    assert out["agenda"]["punkte"] == 55  # keine Ziele → neutral
    assert "gesamt" in out
    g = out["gesamt"]
    assert g["anteile"]["bilanz"] == 0.3
    assert g["anteile"]["agenda"] == 0.35
    assert g["anteile"]["historischesUrteil"] == 0.35
    # Basis ≈ 0.3*80 + 0.35*55 + 0.35*urteil; Urteil ohne Gesetze niedrig
    assert g["wahlBonusPunkte"] == 0.3
    assert isinstance(g["note"], str)
    assert len(g["note"]) >= 1


def test_berechne_gesamtnote_plusminus_skala():
    gs = _minimal_gs()
    r = berechne_gesamtnote(gs, [], [], [])
    assert r["gesamtpunkte"] <= 100.0
    assert r["gesamtnote"] in (
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D",
        "F",
    )


def test_build_spielende_stufe4_archetyp_feld():
    gs = _minimal_gs(complexity=4)
    out = build_spielende_response(gs, [], [], [])
    assert "kanzlerArchetyp" in out
    assert out["kanzlerArchetyp"] is None or isinstance(out["kanzlerArchetyp"], str)
