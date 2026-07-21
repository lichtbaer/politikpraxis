"""
Route-Tests für /api/analytics/* — Auth-Validierung ohne Datenbank.
"""

from uuid import uuid4

import pytest
from app.schemas.analytics import AnalyticsEventRequest, AnalyticsSummaryResponse
from httpx import AsyncClient
from pydantic import ValidationError

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


def test_analytics_summary_response_has_no_stub_fields():
    """win_rate/popular_laws/avg_game_duration_months waren fest verdrahtete
    Stub-Werte und wurden aus dem Response-Schema entfernt."""
    assert set(AnalyticsSummaryResponse.model_fields) == {
        "total_games",
        "avg_approval",
    }


# ---------------------------------------------------------------------------
# AnalyticsEventRequest.save_id — UUID-Validierung (statt UUID(...) im Service)
# ---------------------------------------------------------------------------


def test_analytics_event_request_rejects_invalid_save_id():
    """Ungültige save_id → 422 statt 500 im Service (uuid.UUID-Feldtyp)."""
    with pytest.raises(ValidationError):
        AnalyticsEventRequest(event_type="game_end", game_month=1, save_id="not-a-uuid")


def test_analytics_event_request_accepts_valid_save_id():
    valid = str(uuid4())
    req = AnalyticsEventRequest(event_type="game_end", game_month=1, save_id=valid)
    assert str(req.save_id) == valid


def test_analytics_event_request_accepts_missing_save_id():
    req = AnalyticsEventRequest(event_type="game_end", game_month=1)
    assert req.save_id is None
