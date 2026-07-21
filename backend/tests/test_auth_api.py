"""
Route-Tests für /api/auth/* — die meisten Tests benötigen keine Datenbank
(400/422-Validierungsfehler, 401-Auth-Fehler).
"""

from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient
from tests.conftest import requires_db

# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_register_missing_body(client: AsyncClient):
    """Kein Body → 422 Unprocessable Entity."""
    r = await client.post("/api/auth/register")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_email(client: AsyncClient):
    """Kein E-Mail-Feld → 422."""
    r = await client.post("/api/auth/register", json={"password": "passwort123"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_password(client: AsyncClient):
    """Kein Passwort → 422."""
    r = await client.post("/api/auth/register", json={"email": "test@example.com"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_format(client: AsyncClient):
    """Ungültiges E-Mail-Format → 422."""
    r = await client.post(
        "/api/auth/register", json={"email": "kein-email", "password": "passwort123"}
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_password_over_128_chars(client: AsyncClient):
    """Über 128 Zeichen → 422 (Pydantic max_length, kein DB-Zugriff nötig)."""
    r = await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "a" * 129},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_password_73_bytes_returns_400_not_500(client: AsyncClient):
    """73-Byte-Passwort (< 128 Zeichen) → sauberes 400 statt 500 aus bcrypt.

    validate_password_strength() greift in register_user() vor dem ersten
    DB-Zugriff, daher hier ohne @requires_db testbar.
    """
    r = await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "a" * 73},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_password_multibyte_over_72_bytes_returns_400(
    client: AsyncClient,
):
    """37 Umlaute = 74 Byte UTF-8, aber nur 37 Zeichen (< 128) → 400."""
    r = await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "ü" * 37},
    )
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_missing_body(client: AsyncClient):
    """Kein Body → 422."""
    r = await client.post("/api/auth/login")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_email(client: AsyncClient):
    """Kein E-Mail → 422."""
    r = await client.post("/api/auth/login", json={"password": "passwort123"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_password(client: AsyncClient):
    """Kein Passwort → 422."""
    r = await client.post("/api/auth/login", json={"email": "test@example.com"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_login_password_over_128_chars_returns_422(client: AsyncClient):
    """Über 128 Zeichen → 422 (jetzt auch bei Login validiert, wie Register)."""
    r = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "a" * 129},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
@requires_db
async def test_login_password_over_72_bytes_returns_401_not_500(client: AsyncClient):
    """73-Byte-Passwort (< 128 Zeichen) bei unbekanntem Account → 401, kein 500."""
    r = await client.post(
        "/api/auth/login",
        json={"email": "unknown-user@example.com", "password": "a" * 73},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@requires_db
async def test_refresh_no_cookie(client: AsyncClient):
    """Kein Refresh-Cookie → 401 (erfordert DB für purge_expired_refresh_tokens)."""
    r = await client.post("/api/auth/refresh")
    assert r.status_code == 401


@pytest.mark.asyncio
@requires_db
async def test_refresh_invalid_cookie(client: AsyncClient):
    """Ungültiger Cookie-Wert → 401 (erfordert DB)."""
    r = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": "invalid-cookie-value"},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    """Kein Authorization-Header → 403 (HTTPBearer liefert 403 ohne Header)."""
    r = await client.get("/api/auth/me")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    """Ungültiges Bearer-Token → 401."""
    r = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/auth/account
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_account_no_token(client: AsyncClient):
    """Kein Token → 403."""
    r = await client.delete("/api/auth/account")
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# POST /api/auth/magic-link
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_magic_link_missing_body(client: AsyncClient):
    """Kein Body → 422."""
    r = await client.post("/api/auth/magic-link")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_magic_link_missing_email(client: AsyncClient):
    """Kein E-Mail → 422."""
    r = await client.post("/api/auth/magic-link", json={})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_magic_link_invalid_email(client: AsyncClient):
    """Ungültiges E-Mail-Format → 422."""
    r = await client.post("/api/auth/magic-link", json={"email": "kein-email"})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/auth/magic-link/verify
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_magic_link_verify_rate_limit(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """21. Anfrage in derselben Minute von derselben IP → 429 (Limit: 20/minute).

    consume_magic_link_token und get_db werden gemockt, damit der Test ohne
    DB läuft (analog test_limiter_proxy_ip.py) — geprüft wird nur das Limit.
    """
    import app.routes.auth as auth_routes
    from app.db import database as db_mod
    from app.main import app

    async def _no_user(*_args, **_kwargs):
        return None

    monkeypatch.setattr(auth_routes, "consume_magic_link_token", _no_user)

    async def _fake_db():
        yield AsyncMock()

    app.dependency_overrides[db_mod.get_db] = _fake_db
    try:
        headers = {"X-Real-IP": "203.0.113.42"}
        last_status = None
        for _ in range(21):
            r = await client.get(
                "/api/auth/magic-link/verify",
                params={"token": "invalid-token"},
                headers=headers,
            )
            last_status = r.status_code
        assert last_status == 429
    finally:
        app.dependency_overrides.pop(db_mod.get_db, None)


# ---------------------------------------------------------------------------
# POST /api/auth/password-reset/request
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_password_reset_request_missing_email(client: AsyncClient):
    """Kein E-Mail → 422."""
    r = await client.post("/api/auth/password-reset/request", json={})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_password_reset_request_invalid_email(client: AsyncClient):
    """Ungültiges Format → 422."""
    r = await client.post(
        "/api/auth/password-reset/request", json={"email": "nicht-valid"}
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/auth/password-reset/confirm
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_password_reset_confirm_missing_body(client: AsyncClient):
    """Kein Body → 422."""
    r = await client.post("/api/auth/password-reset/confirm")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_password_reset_confirm_missing_fields(client: AsyncClient):
    """Fehlende Pflichtfelder → 422."""
    r = await client.post("/api/auth/password-reset/confirm", json={"token": "abc"})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_without_cookie(client: AsyncClient):
    """Logout ohne Cookie: immer 200 (idempotent)."""
    r = await client.post("/api/auth/logout")
    assert r.status_code == 200
