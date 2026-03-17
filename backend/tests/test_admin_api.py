"""Pytest-Tests für Admin-API (SMA-258)."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.config import get_settings
from app.main import app
from tests.conftest import requires_db


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def admin_env(monkeypatch):
    """Setzt Admin-Credentials für Tests."""
    monkeypatch.setenv("ADMIN_USER", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_admin_requires_auth(client: AsyncClient, admin_env):
    """GET /api/admin/chars ohne Auth liefert 401."""
    r = await client.get("/api/admin/chars")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_wrong_password(client: AsyncClient, admin_env):
    """Admin mit falschem Passwort liefert 401."""
    r = await client.get("/api/admin/chars", auth=("admin", "wrong"))
    assert r.status_code == 401


@pytest.mark.asyncio
@requires_db
async def test_admin_list_chars(client: AsyncClient, admin_env):
    """GET /api/admin/chars mit Basic-Auth liefert Chars."""
    r = await client.get("/api/admin/chars", auth=("admin", "test"))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert "id" in data[0]
        assert "initials" in data[0]


@pytest.mark.asyncio
@requires_db
async def test_admin_put_char_and_cache_clear(client: AsyncClient, admin_env):
    """PUT /api/admin/chars/{id} aktualisiert Char und invalidiert Cache — Änderung sofort in API sichtbar."""
    # 1. Ursprünglichen Wert holen
    r1 = await client.get("/api/content/chars", params={"locale": "de"})
    assert r1.status_code == 200
    chars = r1.json()
    assert chars, "Keine Chars in DB"
    char_id = chars[0]["id"]
    old_initials = chars[0]["initials"]

    # 2. Über Admin API ändern (z.B. initials)
    new_initials = "XX" if old_initials != "XX" else "YY"
    r2 = await client.put(
        f"/api/admin/chars/{char_id}",
        json={"initials": new_initials},
        auth=("admin", "test"),
    )
    assert r2.status_code == 200

    # 3. Content-API muss sofort den neuen Wert liefern (Cache wurde geleert)
    r3 = await client.get("/api/content/chars", params={"locale": "de"})
    assert r3.status_code == 200
    updated = next((c for c in r3.json() if c["id"] == char_id), None)
    assert updated is not None
    assert updated["initials"] == new_initials

    # 4. Zurücksetzen für andere Tests
    await client.put(
        f"/api/admin/chars/{char_id}",
        json={"initials": old_initials},
        auth=("admin", "test"),
    )


@pytest.mark.asyncio
@requires_db
async def test_admin_list_gesetze(client: AsyncClient, admin_env):
    """GET /api/admin/gesetze liefert Gesetze."""
    r = await client.get("/api/admin/gesetze", auth=("admin", "test"))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
@requires_db
async def test_admin_list_events(client: AsyncClient, admin_env):
    """GET /api/admin/events liefert Events."""
    r = await client.get("/api/admin/events", auth=("admin", "test"))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
@requires_db
async def test_admin_list_bundesrat(client: AsyncClient, admin_env):
    """GET /api/admin/bundesrat liefert Bundesrat-Fraktionen."""
    r = await client.get("/api/admin/bundesrat", auth=("admin", "test"))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
@requires_db
async def test_admin_get_char_404(client: AsyncClient, admin_env):
    """GET /api/admin/chars/{id} für unbekannte ID liefert 404."""
    r = await client.get("/api/admin/chars/nonexistent", auth=("admin", "test"))
    assert r.status_code == 404


@pytest.mark.asyncio
@requires_db
async def test_admin_put_char_i18n(client: AsyncClient, admin_env):
    """PUT /api/admin/chars/{id}/i18n/{locale} aktualisiert i18n."""
    r = await client.get("/api/admin/chars", auth=("admin", "test"))
    assert r.status_code == 200
    chars = r.json()
    if not chars:
        pytest.skip("Keine Chars in DB")
    char_id = chars[0]["id"]

    # Aktuellen Namen aus Content-API holen
    rc = await client.get("/api/content/chars", params={"locale": "de"})
    assert rc.status_code == 200
    content_char = next((c for c in rc.json() if c["id"] == char_id), None)
    if not content_char:
        pytest.skip("Char nicht in Content-API")
    old_name = content_char.get("name", "Anna Hoffmann")

    # Über Admin i18n aktualisieren
    r2 = await client.put(
        f"/api/admin/chars/{char_id}/i18n/de",
        json={"name": "Test Name Update"},
        auth=("admin", "test"),
    )
    assert r2.status_code == 200

    # Content-API muss neuen Namen liefern
    rc2 = await client.get("/api/content/chars", params={"locale": "de"})
    assert rc2.status_code == 200
    updated = next((c for c in rc2.json() if c["id"] == char_id), None)
    assert updated["name"] == "Test Name Update"

    # Zurücksetzen
    await client.put(
        f"/api/admin/chars/{char_id}/i18n/de",
        json={"name": old_name},
        auth=("admin", "test"),
    )
