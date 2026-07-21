"""Tests für die Security-Header-Middleware (app.main.security_headers)."""

import pytest
from app.config import get_settings
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_hsts_absent_in_debug_mode(clear_settings_cache, monkeypatch):
    """DEBUG=1 (kein TLS/Prod) → kein Strict-Transport-Security-Header."""
    monkeypatch.setenv("DEBUG", "1")
    monkeypatch.delenv("COOKIE_SECURE", raising=False)
    get_settings.cache_clear()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        r = await client.get("/api/health")
    assert "Strict-Transport-Security" not in r.headers
    assert r.headers["X-Content-Type-Options"] == "nosniff"


@pytest.mark.asyncio
async def test_hsts_present_when_cookie_secure_true(clear_settings_cache, monkeypatch):
    """COOKIE_SECURE=true (TLS/Prod) → Strict-Transport-Security-Header gesetzt."""
    monkeypatch.setenv("DEBUG", "1")
    monkeypatch.setenv("COOKIE_SECURE", "true")
    get_settings.cache_clear()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        r = await client.get("/api/health")
    assert (
        r.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
    )
