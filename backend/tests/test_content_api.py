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
        # SMA-272: Vorstufen-Felder
        assert "kommunal_pilot_moeglich" in g
        assert "laender_pilot_moeglich" in g
        assert "eu_initiative_moeglich" in g


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_locale_fallback(client: AsyncClient):
    """GET /api/content/gesetze?locale=en nutzt Fallback auf de wenn keine en-Daten."""
    r = await client.get("/api/content/gesetze", params={"locale": "en"})
    # Sollte 200 sein (Fallback auf de) oder leere Liste wenn en existiert
    assert r.status_code == 200


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_18_laws_sma271(client: AsyncClient):
    """GET /api/content/gesetze liefert mindestens 18 Gesetze (4 + 11 + 4 Haushalt)."""
    r = await client.get("/api/content/gesetze", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 18, f"Erwartet mindestens 18 Gesetze, erhalten {len(data)}"
    ids = [g["id"] for g in data]
    assert "mindestlohn" in ids
    assert "klimaschutz" in ids
    assert "grundrechte" in ids
    assert "sondervermoegen_klima" in ids
    assert "schuldenbremse_reform" in ids
    assert "vermoegensteuer" in ids
    assert "steuerreform_2" in ids


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
async def test_get_eu_events_6_events_sma271(client: AsyncClient):
    """GET /api/content/eu-events?locale=de liefert alle 6 EU-Events."""
    r = await client.get("/api/content/eu-events", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 6, f"Erwartet mindestens 6 EU-Events, erhalten {len(data)}"
    ids = [e["id"] for e in data]
    assert "eu_rl_mindestlohn" in ids
    assert "eu_rl_lieferkette" in ids
    assert "eu_rl_klima" in ids
    assert "eu_rechtsruck" in ids
    assert "eu_gipfel_frankreich" in ids
    assert "europawahl" in ids
    for e in data:
        assert "title" in e
        assert "choices" in e
        assert len(e["choices"]) >= 1


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


# --- SMA-260: Milieus, Politikfelder, Verbände ---


@pytest.mark.asyncio
@requires_db
async def test_get_milieus_happy_path(client: AsyncClient):
    """GET /api/content/milieus?locale=de liefert Milieus."""
    r = await client.get("/api/content/milieus", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        m = data[0]
        assert "id" in m
        assert "gewicht" in m
        assert "basisbeteiligung" in m
        assert "ideologie" in m
        assert "wirtschaft" in m["ideologie"]
        assert "gesellschaft" in m["ideologie"]
        assert "staat" in m["ideologie"]
        assert "min_complexity" in m
        assert "aggregat_gruppe" in m
        assert "name" in m
        assert "kurzcharakter" in m
        assert "beschreibung" in m


@pytest.mark.asyncio
async def test_get_milieus_invalid_locale(client: AsyncClient):
    """Ungültige locale bei milieus liefert 400."""
    r = await client.get("/api/content/milieus", params={"locale": "fr"})
    assert r.status_code == 400


@pytest.mark.asyncio
@requires_db
async def test_get_politikfelder_happy_path(client: AsyncClient):
    """GET /api/content/politikfelder?locale=de liefert Politikfelder."""
    r = await client.get("/api/content/politikfelder", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        p = data[0]
        assert "id" in p
        assert "verband_id" in p
        assert "eu_relevanz" in p
        assert "kommunal_relevanz" in p
        assert "min_complexity" in p
        assert "name" in p
        assert "kurz" in p


@pytest.mark.asyncio
async def test_get_politikfelder_invalid_locale(client: AsyncClient):
    """Ungültige locale bei politikfelder liefert 400."""
    r = await client.get("/api/content/politikfelder", params={"locale": "xy"})
    assert r.status_code == 400


@pytest.mark.asyncio
@requires_db
async def test_get_verbaende_happy_path(client: AsyncClient):
    """GET /api/content/verbaende?locale=de liefert Verbände."""
    r = await client.get("/api/content/verbaende", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        v = data[0]
        assert "id" in v
        assert "politikfeld_id" in v
        assert "ideologie" in v
        assert "beziehung_start" in v
        assert "staerke" in v
        assert "bund" in v["staerke"]
        assert "konflikt_mit" in v
        assert "min_complexity" in v
        assert "name" in v
        assert "kurz" in v
        assert "bio" in v
        assert "tradeoffs" in v


@pytest.mark.asyncio
async def test_get_verbaende_invalid_locale(client: AsyncClient):
    """Ungültige locale bei verbaende liefert 400."""
    r = await client.get("/api/content/verbaende", params={"locale": "fr"})
    assert r.status_code == 400


@pytest.mark.asyncio
@requires_db
async def test_get_chars_includes_ideologie(client: AsyncClient):
    """Char-Response enthält ideologie-Objekt."""
    r = await client.get("/api/content/chars", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    if data:
        char = data[0]
        assert "ideologie" in char
        assert "wirtschaft" in char["ideologie"]
        assert "gesellschaft" in char["ideologie"]
        assert "staat" in char["ideologie"]


@pytest.mark.asyncio
@requires_db
async def test_get_gesetze_includes_ideologie_and_politikfeld(client: AsyncClient):
    """Gesetz-Response enthält ideologie, politikfeld_id, politikfeld_sekundaer."""
    r = await client.get("/api/content/gesetze", params={"locale": "de"})
    assert r.status_code == 200
    data = r.json()
    if data:
        g = data[0]
        assert "ideologie" in g
        assert "wirtschaft" in g["ideologie"]
        assert "politikfeld_id" in g
        assert "politikfeld_sekundaer" in g
        assert isinstance(g["politikfeld_sekundaer"], list)
