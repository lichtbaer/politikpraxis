"""Drift-Check Frontend-Fallback vs. Backend-Content (scripts/check_frontend_content_drift.py, #244).

Läuft rein dateibasiert — keine DB nötig, daher kein _db_available-Skip.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import check_frontend_content_drift as drift  # noqa: E402


def test_sim_law_ids_existieren_in_migrationen():
    law_ids = drift.load_test_content_law_ids()
    assert len(law_ids) > 0
    assert drift.validate_law_ids_exist_in_migrations(law_ids) == []


def test_sim_char_ids_existieren_in_yaml():
    char_ids = drift.load_test_content_char_ids()
    assert len(char_ids) > 0
    assert drift.validate_char_ids_exist_in_yaml(char_ids) == []
