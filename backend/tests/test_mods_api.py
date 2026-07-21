"""Route-Tests für /api/mods/* (#254): Upload-Validierung, Download-Counter."""

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


@pytest.fixture(scope="module")
async def auth_token():
    """Registriert einen einzelnen Test-User für alle Mod-Tests dieses Moduls
    (nur eine Registrierung, um das 3/Minute-Rate-Limit von /api/auth/register
    nicht zu strapazieren)."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        email = f"mods-test-{uuid.uuid4().hex[:16]}@example.com"
        r = await ac.post(
            "/api/auth/register",
            json={"email": email, "password": "supersecret123"},
        )
        assert r.status_code == 200, r.text
        return r.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# GET /api/mods
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_list_mods_ok(client: AsyncClient):
    r = await client.get("/api/mods")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# POST /api/mods — Auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_mod_unauthenticated(client: AsyncClient):
    """Kein Token → 401/403."""
    r = await client.post(
        "/api/mods",
        json={"title": "Test Mod", "content": {}},
    )
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# POST /api/mods — Größen-/Content-Validierung
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_create_mod_content_too_large(client: AsyncClient, auth_token: str):
    """Content über MOD_CONTENT_MAX_SIZE (1 MB) → 413."""
    big_content = {"blob": "x" * 1_100_000}
    r = await client.post(
        "/api/mods",
        json={"title": "Too Big Mod", "content": big_content},
        headers=_auth_headers(auth_token),
    )
    assert r.status_code == 413


@pytest.mark.asyncio
@requires_db
async def test_create_mod_invalid_content(client: AsyncClient, auth_token: str):
    """Ungültiger Content (fehlende Pflichtfelder bei characters) → 422."""
    invalid_content = {"characters": [{"id": "x"}]}
    r = await client.post(
        "/api/mods",
        json={"title": "Invalid Mod", "content": invalid_content},
        headers=_auth_headers(auth_token),
    )
    assert r.status_code == 422


@pytest.mark.asyncio
@requires_db
async def test_create_mod_invalid_event_type(client: AsyncClient, auth_token: str):
    """Event mit ungültigem type → 422."""
    invalid_content = {
        "events": [
            {
                "id": "e1",
                "type": "not-a-valid-type",
                "icon": "i",
                "typeLabel": "l",
                "title": "t",
                "quote": "q",
                "context": "c",
                "choices": [],
                "ticker": "tk",
            }
        ]
    }
    r = await client.post(
        "/api/mods",
        json={"title": "Bad Event Mod", "content": invalid_content},
        headers=_auth_headers(auth_token),
    )
    assert r.status_code == 422


@pytest.mark.asyncio
@requires_db
async def test_create_mod_success(client: AsyncClient, auth_token: str):
    """Gültiger, leerer Content → 200, Mod wird angelegt."""
    r = await client.post(
        "/api/mods",
        json={"title": "Valid Mod", "description": "desc", "content": {}},
        headers=_auth_headers(auth_token),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Valid Mod"
    assert data["downloads"] == 0
    assert "id" in data


# ---------------------------------------------------------------------------
# GET /api/mods/{id}, GET /api/mods/{id}/content — Download-Counter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_get_mod_not_found(client: AsyncClient):
    r = await client.get(f"/api/mods/{uuid.uuid4()}")
    assert r.status_code == 404


@pytest.mark.asyncio
@requires_db
async def test_get_mod_content_increments_downloads(
    client: AsyncClient, auth_token: str
):
    """Jeder Aufruf von GET /api/mods/{id}/content erhöht den Download-Zähler."""
    create = await client.post(
        "/api/mods",
        json={"title": "Download Counter Mod", "content": {}},
        headers=_auth_headers(auth_token),
    )
    assert create.status_code == 200
    mod_id = create.json()["id"]

    r1 = await client.get(f"/api/mods/{mod_id}/content")
    assert r1.status_code == 200

    r2 = await client.get(f"/api/mods/{mod_id}/content")
    assert r2.status_code == 200

    detail = await client.get(f"/api/mods/{mod_id}")
    assert detail.status_code == 200
    assert detail.json()["downloads"] == 2


@pytest.mark.asyncio
@requires_db
async def test_get_mod_content_not_found(client: AsyncClient):
    r = await client.get(f"/api/mods/{uuid.uuid4()}/content")
    assert r.status_code == 404
