"""
Tests für Spielstand-API (saves.py) und Schema-Validierung (SaveUpsertRequest).

Schema-Tests laufen ohne Datenbank.
Route-Tests (requires_db) benötigen PostgreSQL.
"""


import pytest
from app.schemas.save import SaveUpsertRequest
from pydantic import ValidationError
from tests.conftest import requires_db

# ---------------------------------------------------------------------------
# Schema-Validierung (kein DB nötig)
# ---------------------------------------------------------------------------

VALID_STATE: dict = {
    "month": 5,
    "pk": 80,
    "zust": {"g": 52, "arbeit": 55, "mitte": 50, "prog": 48},
    "coalition": 65,
    "gesetze": [],
    "chars": [],
}


def _make_req(**overrides) -> dict:
    state = {**VALID_STATE, **overrides}
    return {"game_state": state}


def test_valid_save_passes():
    req = SaveUpsertRequest(game_state=VALID_STATE)
    assert req.game_state["month"] == 5


def test_month_missing_fails():
    bad = {k: v for k, v in VALID_STATE.items() if k != "month"}
    with pytest.raises(ValidationError, match="month"):
        SaveUpsertRequest(game_state=bad)


def test_month_out_of_range_negative():
    with pytest.raises(ValidationError, match="0 und 48"):
        SaveUpsertRequest(game_state={**VALID_STATE, "month": -1})


def test_month_out_of_range_high():
    with pytest.raises(ValidationError, match="0 und 48"):
        SaveUpsertRequest(game_state={**VALID_STATE, "month": 49})


def test_pk_out_of_range_negative():
    with pytest.raises(ValidationError, match="0 und 200"):
        SaveUpsertRequest(game_state={**VALID_STATE, "pk": -5})


def test_pk_out_of_range_too_high():
    with pytest.raises(ValidationError, match="0 und 200"):
        SaveUpsertRequest(game_state={**VALID_STATE, "pk": 201})


def test_pk_boundary_values():
    SaveUpsertRequest(game_state={**VALID_STATE, "pk": 0})
    SaveUpsertRequest(game_state={**VALID_STATE, "pk": 200})


def test_zust_g_out_of_range():
    bad_zust = {"g": 101, "arbeit": 50, "mitte": 50, "prog": 50}
    with pytest.raises(ValidationError, match="0 und 100"):
        SaveUpsertRequest(game_state={**VALID_STATE, "zust": bad_zust})


def test_zust_g_negative():
    bad_zust = {"g": -1, "arbeit": 50, "mitte": 50, "prog": 50}
    with pytest.raises(ValidationError, match="0 und 100"):
        SaveUpsertRequest(game_state={**VALID_STATE, "zust": bad_zust})


def test_coalition_out_of_range():
    with pytest.raises(ValidationError, match="0 und 100"):
        SaveUpsertRequest(game_state={**VALID_STATE, "coalition": 101})


def test_coalition_negative():
    with pytest.raises(ValidationError, match="0 und 100"):
        SaveUpsertRequest(game_state={**VALID_STATE, "coalition": -1})


def test_gesetze_not_list_fails():
    with pytest.raises(ValidationError, match="Liste"):
        SaveUpsertRequest(game_state={**VALID_STATE, "gesetze": "invalid"})


def test_chars_not_list_fails():
    with pytest.raises(ValidationError, match="Liste"):
        SaveUpsertRequest(game_state={**VALID_STATE, "chars": {"key": "value"}})


def test_size_limit_exceeded():
    """game_state > 500 KB wird abgelehnt."""
    big_state = {**VALID_STATE, "data": "x" * (500 * 1024 + 1)}
    with pytest.raises(ValidationError, match="500 KB"):
        SaveUpsertRequest(game_state=big_state)


def test_nesting_depth_exceeded():
    """Zu tief verschachtelter game_state wird abgelehnt."""
    deep: dict = {"month": 1}
    current = deep
    for _ in range(12):
        current["nested"] = {}
        current = current["nested"]
    with pytest.raises(ValidationError, match="Verschachtelung"):
        SaveUpsertRequest(game_state=deep)


def test_pk_not_numeric_fails():
    with pytest.raises(ValidationError, match="numerisch"):
        SaveUpsertRequest(game_state={**VALID_STATE, "pk": "viel"})


def test_zust_g_not_numeric_fails():
    bad_zust = {"g": "hoch", "arbeit": 50, "mitte": 50, "prog": 50}
    with pytest.raises(ValidationError, match="numerisch"):
        SaveUpsertRequest(game_state={**VALID_STATE, "zust": bad_zust})


def test_coalition_not_numeric_fails():
    with pytest.raises(ValidationError, match="numerisch"):
        SaveUpsertRequest(game_state={**VALID_STATE, "coalition": "stark"})


def test_optional_fields_absent_ok():
    """pk, zust, coalition sind optional — fehlen ohne Fehler."""
    minimal = {"month": 1}
    req = SaveUpsertRequest(game_state=minimal)
    assert req.game_state["month"] == 1


# ---------------------------------------------------------------------------
# Route-Tests (erfordern DB)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_save_slot_unauthenticated(client):
    """POST /api/saves/1 ohne Token liefert 401."""
    r = await client.post("/api/saves/1", json={"game_state": VALID_STATE})
    assert r.status_code == 401


@pytest.mark.asyncio
@requires_db
async def test_get_saves_unauthenticated(client):
    """GET /api/saves ohne Token liefert 401."""
    r = await client.get("/api/saves")
    assert r.status_code == 401


@pytest.mark.asyncio
@requires_db
async def test_save_slot_invalid_state(client):
    """POST /api/saves/1 mit ungültigem game_state (pk zu hoch) liefert 422."""
    bad_state = {**VALID_STATE, "pk": 999}
    r = await client.post("/api/saves/1", json={"game_state": bad_state})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_save_slot_out_of_range(client):
    """POST /api/saves/4 liefert 422 (Slot 4 existiert nicht)."""
    r = await client.post("/api/saves/4", json={"game_state": VALID_STATE})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_save_slot_zero(client):
    """POST /api/saves/0 liefert 422 (Slot 0 ungültig)."""
    r = await client.post("/api/saves/0", json={"game_state": VALID_STATE})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_delete_save_unauthenticated(client):
    """DELETE /api/saves/1 ohne Token liefert 401."""
    r = await client.delete("/api/saves/1")
    assert r.status_code == 401
