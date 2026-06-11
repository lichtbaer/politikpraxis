"""Kreuzvalidierung der YAML-Spieldaten (scripts/validate_content.py).

Läuft rein dateibasiert — keine DB nötig, daher kein _db_available-Skip.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import validate_content  # noqa: E402


def test_event_ids_eindeutig():
    events = validate_content.load_events()
    assert validate_content.validate_event_ids_unique(events) == []


def test_charmood_referenzen_existieren():
    events = validate_content.load_events()
    char_ids = validate_content.load_char_ids()
    assert validate_content.validate_char_references(events, char_ids) == []


def test_event_referenzen_existieren():
    events = validate_content.load_events()
    char_ids = validate_content.load_char_ids()
    assert validate_content.validate_event_references(events, char_ids) == []


def test_gesetz_referenzen_existieren():
    events = validate_content.load_events()
    assert validate_content.validate_law_references(events) == []


def test_choice_struktur_vollstaendig():
    events = validate_content.load_events()
    assert validate_content.validate_choice_structure(events) == []


def test_bundesrat_konsistent():
    assert validate_content.validate_bundesrat() == []


def test_szenarien_konsistent():
    assert validate_content.validate_scenarios() == []
