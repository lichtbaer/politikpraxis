"""Tests für die Security-Header-Middleware (app/main.py:security_headers).

HSTS soll nur gesetzt werden, wenn TLS/Prod aktiv ist (#252) — sonst würde der
Header Folgeanfragen über HTTP im Dev-/HTTP-Betrieb unnötig erschweren.
"""

import pytest
from app.main import settings
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_hsts_absent_when_not_tls(client: AsyncClient, monkeypatch):
    """cookie_secure=False (bzw. Debug-Default) → kein HSTS-Header."""
    monkeypatch.setattr(settings, "cookie_secure", False)
    r = await client.get("/api/health")
    assert "Strict-Transport-Security" not in r.headers


@pytest.mark.asyncio
async def test_hsts_present_when_tls(client: AsyncClient, monkeypatch):
    """cookie_secure=True (TLS/Prod) → HSTS-Header gesetzt."""
    monkeypatch.setattr(settings, "cookie_secure", True)
    r = await client.get("/api/health")
    assert "max-age=31536000" in r.headers["Strict-Transport-Security"]


@pytest.mark.asyncio
async def test_other_security_headers_always_present(client: AsyncClient):
    """Die übrigen Security-Header bleiben unabhängig von HSTS aktiv."""
    r = await client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
