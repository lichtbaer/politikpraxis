"""
Tests für /api/usertest-feedback und UserTestFeedbackCreate-Schema (SMA-250).

Schema-Tests laufen ohne Datenbank. Route-Tests, die eine DB-Schreiboperation
auslösen, sind mit @requires_db markiert.
"""

import pytest
from app.schemas.usertest_feedback import UserTestFeedbackCreate
from app.services.auth_service import create_access_token
from httpx import AsyncClient
from pydantic import ValidationError
from tests.conftest import requires_db

VALID_PAYLOAD: dict = {
    "session_id": "session-1234567",
    "kontext": "header",
}

# ---------------------------------------------------------------------------
# Schema-Validierung (kein DB nötig)
# ---------------------------------------------------------------------------


def test_valid_payload_without_game_stat_id_passes():
    req = UserTestFeedbackCreate(**VALID_PAYLOAD)
    assert req.game_stat_id is None


def test_valid_game_stat_id_parsed_as_uuid():
    req = UserTestFeedbackCreate(
        **VALID_PAYLOAD, game_stat_id="12345678-1234-5678-1234-567812345678"
    )
    assert str(req.game_stat_id) == "12345678-1234-5678-1234-567812345678"


def test_invalid_game_stat_id_raises_validation_error():
    """Ungültige UUID → ValidationError (422 auf Route-Ebene), kein 500."""
    with pytest.raises(ValidationError, match="game_stat_id"):
        UserTestFeedbackCreate(**VALID_PAYLOAD, game_stat_id="not-a-uuid")


def test_invalid_kontext_raises_validation_error():
    with pytest.raises(ValidationError, match="Kontext"):
        UserTestFeedbackCreate(**{**VALID_PAYLOAD, "kontext": "invalid"})


# ---------------------------------------------------------------------------
# POST /api/usertest-feedback — Route-Ebene
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_feedback_invalid_game_stat_id_returns_422(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "game_stat_id": "not-a-uuid"},
    )
    assert r.status_code == 422


@requires_db
@pytest.mark.asyncio
async def test_submit_feedback_non_uuid_sub_token_does_not_500(client: AsyncClient):
    """Optionaler Auth-Header mit nicht-UUID `sub` → wie anonym behandelt, kein 500."""
    token = create_access_token("not-a-valid-uuid")
    r = await client.post(
        "/api/usertest-feedback",
        json=VALID_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201


@requires_db
@pytest.mark.asyncio
async def test_submit_feedback_valid_payload_created(client: AsyncClient):
    r = await client.post("/api/usertest-feedback", json=VALID_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert "id" in body
    assert "created_at" in body
