"""
Route-Tests für /api/analytics/* — Auth-Validierung ohne Datenbank.
"""

import pytest
from app.schemas.analytics import AnalyticsEventRequest, AnalyticsSummaryResponse
from httpx import AsyncClient
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# AnalyticsEventRequest.save_id — Schema-Validierung (kein DB nötig, SMA-250)
# ---------------------------------------------------------------------------


def test_event_request_valid_save_id_parsed_as_uuid():
    req = AnalyticsEventRequest(
        event_type="game_end",
        game_month=12,
        save_id="12345678-1234-5678-1234-567812345678",
    )
    assert str(req.save_id) == "12345678-1234-5678-1234-567812345678"


def test_event_request_missing_save_id_is_none():
    req = AnalyticsEventRequest(event_type="game_end", game_month=12)
    assert req.save_id is None


def test_event_request_invalid_save_id_raises_validation_error():
    """Ungültige UUID → ValidationError (422 auf Route-Ebene), kein 500."""
    with pytest.raises(ValidationError, match="save_id"):
        AnalyticsEventRequest(
            event_type="game_end", game_month=12, save_id="not-a-uuid"
        )


def test_summary_response_no_longer_has_dead_stub_fields():
    """win_rate/popular_laws/avg_game_duration_months wurden entfernt (SMA-250)."""
    resp = AnalyticsSummaryResponse(total_games=1, avg_approval=50.0)
    assert not hasattr(resp, "win_rate")
    assert not hasattr(resp, "popular_laws")
    assert not hasattr(resp, "avg_game_duration_months")


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


@pytest.mark.asyncio
async def test_analytics_batch_invalid_save_id_never_500(client: AsyncClient):
    """Ungültige save_id im Event-Payload → nie 500 (401/403/422 statt Crash, SMA-250)."""
    r = await client.post(
        "/api/analytics/batch",
        json={
            "events": [
                {"event_type": "game_end", "game_month": 12, "save_id": "not-a-uuid"}
            ]
        },
        headers={"Authorization": "Bearer invalid.token"},
    )
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
