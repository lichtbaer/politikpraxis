"""
Route-Tests für /api/analytics/* — Auth-Validierung ohne Datenbank.
"""

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# POST /api/analytics/batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analytics_batch_no_auth(client: AsyncClient):
    """Kein Token → 403 (HTTPBearer ohne Header)."""
    r = await client.post("/api/analytics/batch", json={"events": []})
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_analytics_batch_invalid_token(client: AsyncClient):
    """Ungültiges Bearer-Token → 401."""
    r = await client.post(
        "/api/analytics/batch",
        json={"events": []},
        headers={"Authorization": "Bearer invalid.token"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_analytics_batch_missing_body(client: AsyncClient):
    """Kein Body — keine Authentifizierung → 403/401 (Auth-Check kommt zuerst)."""
    r = await client.post("/api/analytics/batch")
    assert r.status_code in (401, 403, 422)


# ---------------------------------------------------------------------------
# GET /api/analytics/summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analytics_summary_no_auth(client: AsyncClient):
    """Kein Token → 403."""
    r = await client.get("/api/analytics/summary")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_analytics_summary_invalid_token(client: AsyncClient):
    """Ungültiges Token → 401."""
    r = await client.get(
        "/api/analytics/summary",
        headers={"Authorization": "Bearer nicht.gueltig"},
    )
    assert r.status_code == 401
