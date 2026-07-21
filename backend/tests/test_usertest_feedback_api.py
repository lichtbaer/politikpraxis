"""Route-Tests für /api/usertest-feedback und /api/admin/usertest-feedback (#254)."""

import uuid

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient
from tests.conftest import requires_db


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def _unique_ip() -> str:
    """Eigene X-Real-IP pro Test — isoliert vom In-Memory-Rate-Limit
    (5 Requests/Stunde), das sonst über alle Tests dieses Prozesses geteilt wird."""
    return (
        f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"
    )


VALID_PAYLOAD = {
    "session_id": "test-session-id-12345",
    "kontext": "header",
    "bewertung_gesamt": 5,
    "verstaendlichkeit": 4,
    "fehler_gemeldet": False,
}


# ---------------------------------------------------------------------------
# POST /api/usertest-feedback — Validierung (kein DB-Zugriff vor 422)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_feedback_missing_body(client: AsyncClient):
    r = await client.post("/api/usertest-feedback")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_missing_session_id(client: AsyncClient):
    r = await client.post("/api/usertest-feedback", json={"kontext": "header"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_invalid_kontext(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "kontext": "nicht-erlaubt"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_invalid_game_stat_id(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "game_stat_id": "keine-uuid"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_bewertung_out_of_range(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "bewertung_gesamt": 6},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/usertest-feedback — Erfolgsfall + Rate-Limit (erfordern DB)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_submit_feedback_success(client: AsyncClient):
    r = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "session_id": f"session-{uuid.uuid4().hex}"},
        headers={"X-Real-IP": _unique_ip()},
    )
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
@requires_db
async def test_submit_feedback_anonymous_without_user(client: AsyncClient):
    """Feedback ohne Login (user_id bleibt NULL) funktioniert."""
    r = await client.post(
        "/api/usertest-feedback",
        json={
            "session_id": f"session-{uuid.uuid4().hex}",
            "kontext": "spielende",
        },
        headers={"X-Real-IP": _unique_ip()},
    )
    assert r.status_code == 201


@pytest.mark.asyncio
@requires_db
async def test_submit_feedback_rate_limited_after_five(client: AsyncClient):
    """6. Anfrage von derselben IP innerhalb einer Stunde → 429."""
    ip = _unique_ip()
    for _ in range(5):
        r = await client.post(
            "/api/usertest-feedback",
            json={**VALID_PAYLOAD, "session_id": f"session-{uuid.uuid4().hex}"},
            headers={"X-Real-IP": ip},
        )
        assert r.status_code == 201

    r6 = await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "session_id": f"session-{uuid.uuid4().hex}"},
        headers={"X-Real-IP": ip},
    )
    assert r6.status_code == 429


# ---------------------------------------------------------------------------
# GET /api/admin/usertest-feedback — Admin-Guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_feedback_requires_admin(client: AsyncClient):
    r = await client.get("/api/admin/usertest-feedback")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_export_feedback_csv_requires_admin(client: AsyncClient):
    r = await client.get("/api/admin/usertest-feedback/export")
    assert r.status_code == 401


@pytest.mark.asyncio
@requires_db
async def test_list_feedback_with_admin(client: AsyncClient, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_USER", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test")
    get_settings.cache_clear()

    await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "session_id": f"session-{uuid.uuid4().hex}"},
        headers={"X-Real-IP": _unique_ip()},
    )

    r = await client.get("/api/admin/usertest-feedback", auth=("admin", "test"))
    get_settings.cache_clear()
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
@requires_db
async def test_export_feedback_csv_with_admin(client: AsyncClient, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_USER", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test")
    get_settings.cache_clear()

    await client.post(
        "/api/usertest-feedback",
        json={**VALID_PAYLOAD, "session_id": f"session-{uuid.uuid4().hex}"},
        headers={"X-Real-IP": _unique_ip()},
    )

    r = await client.get("/api/admin/usertest-feedback/export", auth=("admin", "test"))
    get_settings.cache_clear()
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers.get("content-disposition", "")
    body = r.text
    assert "kontext" in body.splitlines()[0]
