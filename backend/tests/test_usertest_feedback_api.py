"""Route-Tests für POST /api/usertest-feedback — ungültige UUIDs ohne DB."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_feedback_invalid_game_stat_id_returns_422(client: AsyncClient):
    """Ungültige game_stat_id (keine UUID) → 422 statt 500."""
    r = await client.post(
        "/api/usertest-feedback",
        json={"session_id": "a" * 10, "game_stat_id": "not-a-uuid"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_invalid_kontext_returns_422(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={"session_id": "a" * 10, "kontext": "invalid-kontext"},
    )
    assert r.status_code == 422
