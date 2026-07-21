"""
Security-Header-Middleware (app.main.security_headers) und die zugrunde
liegende Settings-Logik (`effective_cookie_secure`), an die HSTS gekoppelt ist.
"""

import pytest
from app.config import Settings
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# effective_cookie_secure — Basis für die HSTS-Kopplung
# ---------------------------------------------------------------------------


def test_effective_cookie_secure_true_in_prod_by_default():
    s = Settings(debug=False, cookie_secure=None)
    assert s.effective_cookie_secure is True


def test_effective_cookie_secure_false_in_debug_by_default():
    s = Settings(debug=True, cookie_secure=None)
    assert s.effective_cookie_secure is False


def test_effective_cookie_secure_explicit_override_wins():
    s = Settings(debug=False, cookie_secure=False)
    assert s.effective_cookie_secure is False
    s2 = Settings(debug=True, cookie_secure=True)
    assert s2.effective_cookie_secure is True


# ---------------------------------------------------------------------------
# security_headers Middleware — Tests laufen mit DEBUG=1 (siehe conftest.py),
# effective_cookie_secure ist dort also False → kein HSTS erwartet.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_hsts_header_when_not_secure(client: AsyncClient):
    r = await client.get("/api/health")
    assert "Strict-Transport-Security" not in r.headers


@pytest.mark.asyncio
async def test_other_security_headers_present_regardless_of_hsts(
    client: AsyncClient,
):
    """Die übrigen Security-Header sind unabhängig von TLS/effective_cookie_secure."""
    r = await client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"


@pytest.mark.asyncio
async def test_no_security_headers_outside_api_prefix(client: AsyncClient):
    """Header werden nur auf /api/* gesetzt (bestehendes Verhalten, unverändert)."""
    r = await client.get("/nonexistent-non-api-path")
    assert "X-Content-Type-Options" not in r.headers
