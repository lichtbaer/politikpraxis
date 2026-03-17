"""Pytest-Tests für Content-API-Endpoints (SMA-255)."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from tests.conftest import requires_db


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.mark.asyncio
@requires_db
async def test_get_chars_happy_path(client: AsyncClient):
    """GET /api/content/chars?locale=de liefert Charaktere."""
    r = await client.get("/api/content/chars", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        char = data[0]
        assert "id" in char
        assert "initials" in char
        assert "name" in char
        assert "role" in char
        assert "bio" in char


@pytest.mark.asyncio
@requires_db
async def test_get_chars_locale_default(client: AsyncClient):
    """GET /api/content/chars ohne locale nutzt default 'de'."""
    r = await client.get("/api/content/chars")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_get_chars_invalid_locale(client: AsyncClient):
    """Ungültige locale liefert 400."""
    r = await client.get("/api/content/chars", params={"locale": "fr"})
    assert r.status_code == 400
    assert "locale" in r.json().get("detail", "").lower() or "fr" in r.json().get("detail", "")


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_happy_path(client: AsyncClient):
    """GET /api/content/gesetze?locale=de liefert Gesetze."""
    r = await client.get("/api/content/gesetze", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        g = data[0]
        assert "id" in g
        assert "tags" in g
        assert "bt_stimmen_ja" in g
        assert "effekte" in g
        assert "titel" in g
        assert "kurz" in g


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_locale_fallback(client: AsyncClient):
    """GET /api/content/gesetze?locale=en nutzt Fallback auf de wenn keine en-Daten."""
    r = await client.get("/api/content/gesetze", params={"locale": "en"})
    # Sollte 200 sein (Fallback auf de) oder leere Liste wenn en existiert
    assert r.status_code == 200


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_14_laws_sma265(client: AsyncClient):
    """GET /api/content/gesetze liefert mindestens 14 Gesetze (4 + 10 neue + Grundrechte)."""
    r = await client.get("/api/content/gesetze", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 14, f"Erwartet mindestens 14 Gesetze, erhalten {len(data)}"
    ids = [g["id"] for g in data]
    assert "mindestlohn" in ids
    assert "klimaschutz" in ids
    assert "grundrechte" in ids


@pytest.mark.asyncio
@requires_db
async def test_get_events_happy_path(client: AsyncClient):
    """GET /api/content/events?locale=de liefert Events."""
    r = await client.get("/api/content/events", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        e = data[0]
        assert "id" in e
        assert "event_type" in e
        assert "title" in e
        assert "choices" in e


@pytest.mark.asyncio
@requires_db
async def test_get_events_type_filter(client: AsyncClient):
    """GET /api/content/events?locale=de&type=random filtert nach event_type."""
    r = await client.get("/api/content/events", params={"locale": "de", "type": "random"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    for e in data:
        assert e["event_type"] == "random"


@pytest.mark.asyncio
@requires_db
async def test_get_bundesrat_happy_path(client: AsyncClient):
    """GET /api/content/bundesrat?locale=de liefert Bundesrat-Fraktionen."""
    r = await client.get("/api/content/bundesrat", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        b = data[0]
        assert "id" in b
        assert "laender" in b
        assert "name" in b
        assert "tradeoffs" in b


@pytest.mark.asyncio
async def test_get_bundesrat_invalid_locale(client: AsyncClient):
    """Ungültige locale bei bundesrat liefert 400."""
    r = await client.get("/api/content/bundesrat", params={"locale": "xy"})
    assert r.status_code == 400
