"""Tests für POST /api/game/{save_id}/agenda (Schema ohne DB)."""

import pytest
from app.schemas.game import AgendaUpdateRequest
from pydantic import ValidationError


def test_agenda_request_valid():
    r = AgendaUpdateRequest(
        spieler_agenda=["ag_milieu_mitte", "ag_gesetz_breit_regieren"],
        koalitions_agenda=["kz_gp_umweltgesetz"],
    )
    assert len(r.spieler_agenda) == 2


def test_agenda_request_rejects_invalid_id():
    with pytest.raises(ValidationError):
        AgendaUpdateRequest(spieler_agenda=["bad-ID"])


def test_agenda_request_rejects_too_many():
    with pytest.raises(ValidationError):
        AgendaUpdateRequest(spieler_agenda=[f"id_{i}" for i in range(20)])
