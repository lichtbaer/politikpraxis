"""
Route-Tests für /api/analytics/* — Auth-Validierung ohne Datenbank.
"""

import pytest
from app.services.auth_service import create_access_token
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


@pytest.mark.asyncio
async def test_analytics_batch_non_uuid_token_sub_returns_401(client: AsyncClient):
    """Gültig signiertes Token, aber `sub` ist keine UUID → 401 statt 500."""
    token = create_access_token("not-a-uuid")
    r = await client.post(
        "/api/analytics/batch",
        json={"events": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401


def test_analytics_event_invalid_save_id_raises_validation_error():
    """`save_id` ohne gültiges UUID-Format → Pydantic-ValidationError (422 via FastAPI)."""
    from app.schemas.analytics import AnalyticsEventRequest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        AnalyticsEventRequest(
            event_type="test", payload={}, game_month=1, save_id="not-a-valid-uuid"
        )


def test_analytics_event_valid_save_id_ok():
    from app.schemas.analytics import AnalyticsEventRequest

    ev = AnalyticsEventRequest(
        event_type="test",
        payload={},
        game_month=1,
        save_id="12345678-1234-5678-1234-567812345678",
    )
    assert ev.save_id == "12345678-1234-5678-1234-567812345678"


def test_analytics_event_no_save_id_ok():
    from app.schemas.analytics import AnalyticsEventRequest

    ev = AnalyticsEventRequest(event_type="test", payload={}, game_month=1)
    assert ev.save_id is None


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
