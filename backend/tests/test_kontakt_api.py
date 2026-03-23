"""Tests für /api/kontakt (Honeypot, Rate-Limit, SMTP-Pfad)."""

from unittest.mock import patch

import pytest
from app.config import get_settings
from app.main import app
from app.services.rate_limit import reset_for_tests
from httpx import ASGITransport, AsyncClient

VALID_BODY = {
    "name": "Test Nutzer",
    "email": "test@example.com",
    "betreff": "Allgemeine Anfrage",
    "nachricht": "Dies ist eine gültige Testnachricht.",
    "website": "",
}


@pytest.fixture
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def clear_buckets():
    reset_for_tests()
    yield
    reset_for_tests()


@pytest.fixture
async def client(clear_settings_cache, clear_buckets):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.anyio
async def test_honeypot_returns_success_without_smtp(client: AsyncClient):
    """Spam-Bots: gefülltes Honeypot-Feld — stiller Erfolg, kein SMTP."""
    r = await client.post("/api/kontakt", json={"website": "http://spam.example"})
    assert r.status_code == 200
    assert r.json() == {"success": True}


@pytest.mark.anyio
async def test_smtp_not_configured_503(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)
    monkeypatch.delenv("CONTACT_RECIPIENT", raising=False)
    get_settings.cache_clear()
    r = await client.post("/api/kontakt", json=VALID_BODY)
    assert r.status_code == 503
    get_settings.cache_clear()


@pytest.mark.anyio
async def test_kontakt_send_success_with_mock_smtp(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SMTP_HOST", "smtp.test.local")
    monkeypatch.setenv("SMTP_PORT", "465")
    monkeypatch.setenv("SMTP_USER", "sender@test.local")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("CONTACT_RECIPIENT", "inbox@test.local")
    get_settings.cache_clear()
    try:
        with patch("app.routes.kontakt._send_smtp_sync") as send:
            r = await client.post("/api/kontakt", json=VALID_BODY)
            assert r.status_code == 200
            assert r.json() == {"success": True}
            send.assert_called_once()
    finally:
        get_settings.cache_clear()


@pytest.mark.anyio
async def test_rate_limit_fourth_request_429(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SMTP_HOST", "smtp.test.local")
    monkeypatch.setenv("SMTP_USER", "sender@test.local")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("CONTACT_RECIPIENT", "inbox@test.local")
    get_settings.cache_clear()
    try:
        with patch("app.routes.kontakt._send_smtp_sync"):
            for i in range(3):
                body = {
                    **VALID_BODY,
                    "email": f"u{i}@example.com",
                    "nachricht": VALID_BODY["nachricht"] + f" {i}",
                }
                r = await client.post("/api/kontakt", json=body)
                assert r.status_code == 200, f"request {i}"
            r4 = await client.post(
                "/api/kontakt",
                json={**VALID_BODY, "nachricht": VALID_BODY["nachricht"] + " x"},
            )
            assert r4.status_code == 429
    finally:
        get_settings.cache_clear()
