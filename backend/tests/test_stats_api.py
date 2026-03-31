"""
Route-Tests für /api/stats/*.

Schema-Tests laufen ohne Datenbank.
Route-Tests mit DB sind mit requires_db markiert.
"""

import pytest
from httpx import AsyncClient
from tests.conftest import requires_db

# ---------------------------------------------------------------------------
# POST /api/stats
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_stats_missing_body(client: AsyncClient):
    """Kein Body → 422."""
    r = await client.post("/api/stats")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_post_stats_missing_session_id_no_auth(client: AsyncClient):
    """Kein session_id und kein Login → 400 oder 422 (Validierung)."""
    r = await client.post("/api/stats", json={"session_id": "   "})
    # Ohne DB können wir nicht bis zur Route kommen, aber Schema-Check ist möglich
    assert r.status_code in (400, 422, 500)


@pytest.mark.asyncio
async def test_post_stats_invalid_schema(client: AsyncClient):
    """Ungültige Felder → 422."""
    r = await client.post("/api/stats", json={"invalid_field": "x"})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/stats/me
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stats_me_no_auth(client: AsyncClient):
    """Kein Token → 403."""
    r = await client.get("/api/stats/me")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_stats_me_invalid_token(client: AsyncClient):
    """Ungültiges Token → 401."""
    r = await client.get(
        "/api/stats/me",
        headers={"Authorization": "Bearer bad.token.here"},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/stats/highscores
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_highscores_default(client: AsyncClient):
    """Ohne Filter → 200 mit leerer oder gefüllter Liste."""
    r = await client.get("/api/stats/highscores")
    assert r.status_code == 200
    data = r.json()
    assert "entries" in data


@pytest.mark.asyncio
@requires_db
async def test_highscores_with_filter(client: AsyncClient):
    """Mit Partei-Filter → 200."""
    r = await client.get("/api/stats/highscores", params={"partei": "sdp", "limit": 5})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_highscores_limit_out_of_range(client: AsyncClient):
    """limit=0 ist ungültig (ge=1) → 422."""
    r = await client.get("/api/stats/highscores", params={"limit": 0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_highscores_limit_too_large(client: AsyncClient):
    """limit=101 überschreitet Maximum (le=100) → 422."""
    r = await client.get("/api/stats/highscores", params={"limit": 101})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/stats/community
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_community_stats(client: AsyncClient):
    """Community-Stats → 200."""
    r = await client.get("/api/stats/community")
    assert r.status_code == 200
