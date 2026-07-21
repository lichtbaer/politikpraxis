"""
Tests für /api/usertest-feedback — Schema-Validierung (v.a. UUID-Handling
für game_stat_id) ohne Datenbank.
"""

from uuid import uuid4

import pytest
from app.schemas.usertest_feedback import UserTestFeedbackCreate
from httpx import AsyncClient
from pydantic import ValidationError
from tests.conftest import requires_db

# ---------------------------------------------------------------------------
# UserTestFeedbackCreate.game_stat_id — UUID-Validierung
# ---------------------------------------------------------------------------


def test_schema_rejects_invalid_game_stat_id():
    with pytest.raises(ValidationError):
        UserTestFeedbackCreate(session_id="a" * 10, game_stat_id="not-a-uuid")


def test_schema_accepts_valid_game_stat_id():
    valid = str(uuid4())
    fb = UserTestFeedbackCreate(session_id="a" * 10, game_stat_id=valid)
    assert str(fb.game_stat_id) == valid


def test_schema_accepts_missing_game_stat_id():
    fb = UserTestFeedbackCreate(session_id="a" * 10)
    assert fb.game_stat_id is None


# ---------------------------------------------------------------------------
# POST /api/usertest-feedback — invalide game_stat_id → 422 statt 500
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_feedback_invalid_game_stat_id_returns_422(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={"session_id": "a" * 10, "game_stat_id": "not-a-uuid"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_missing_session_id_returns_422(client: AsyncClient):
    r = await client.post("/api/usertest-feedback", json={})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_invalid_kontext_returns_422(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={"session_id": "a" * 10, "kontext": "nicht-erlaubt"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
@requires_db
async def test_submit_feedback_success_returns_201(client: AsyncClient):
    """Erfolgreiches Feedback wird gespeichert; die Mail-Benachrichtigung läuft
    über BackgroundTasks (statt asyncio.create_task) und darf die Response
    nicht blockieren oder fehlschlagen lassen, auch ohne konfiguriertes SMTP."""
    r = await client.post(
        "/api/usertest-feedback",
        json={
            "session_id": "a" * 10,
            "kontext": "header",
            "bewertung_gesamt": 5,
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert "created_at" in data
