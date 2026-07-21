"""
Tests für die Security-Header-Middleware (app/main.py) — insbesondere HSTS,
das nur gesetzt werden soll wenn TLS/Prod aktiv ist (effective_cookie_secure).
"""

import pytest
from app import main as app_main
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_hsts_absent_in_debug_mode():
    """Im Test-/Debug-Betrieb (effective_cookie_secure=False) fehlt HSTS."""
    assert app_main.settings.effective_cookie_secure is False
    async with AsyncClient(
        transport=ASGITransport(app=app_main.app), base_url="http://test"
    ) as ac:
        r = await ac.get("/api/health")
    assert "Strict-Transport-Security" not in r.headers


@pytest.mark.asyncio
async def test_other_security_headers_always_present():
    async with AsyncClient(
        transport=ASGITransport(app=app_main.app), base_url="http://test"
    ) as ac:
        r = await ac.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


@pytest.mark.asyncio
async def test_hsts_present_when_cookie_secure_enabled(monkeypatch):
    """Wird effective_cookie_secure True (TLS/Prod), muss HSTS gesetzt sein."""
    monkeypatch.setattr(app_main.settings, "cookie_secure", True)
    assert app_main.settings.effective_cookie_secure is True
    async with AsyncClient(
        transport=ASGITransport(app=app_main.app), base_url="http://test"
    ) as ac:
        r = await ac.get("/api/health")
    assert (
        r.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
    )
