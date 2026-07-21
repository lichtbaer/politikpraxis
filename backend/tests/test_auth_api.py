"""
Route-Tests für /api/auth/* — die meisten Tests benötigen keine Datenbank
(400/422-Validierungsfehler, 401-Auth-Fehler).
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from tests.conftest import requires_db

# bcrypt hasht nur die ersten 72 Bytes; "ü" ist 2 Bytes UTF-8, also erzeugt
# 73 "ü" ein 146-Byte-Passwort — über dem Limit, aber unter max_length=128 Zeichen.
PASSWORD_OVER_72_BYTES = "ü" * 73

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
async def test_register_password_over_72_bytes_rejected(client: AsyncClient):
    """Passwort >72 Byte (UTF-8) → 422 statt 500 beim bcrypt-Hashing."""
    r = await client.post(
        "/api/auth/register",
        json={"email": "toolong@example.com", "password": PASSWORD_OVER_72_BYTES},
    )
    assert r.status_code == 422


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
async def test_login_password_over_72_bytes_rejected(client: AsyncClient):
    """Passwort >72 Byte (UTF-8) → 422 statt 500 beim bcrypt-Checkpw.

    Register und Login müssen sich hier konsistent verhalten (siehe #252).
    """
    r = await client.post(
        "/api/auth/login",
        json={"email": "toolong@example.com", "password": PASSWORD_OVER_72_BYTES},
    )
    assert r.status_code == 422


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


@pytest.mark.asyncio
async def test_password_reset_confirm_new_password_over_72_bytes_rejected(
    client: AsyncClient,
):
    """new_password >72 Byte (UTF-8) → 422 statt 500 beim bcrypt-Hashing."""
    r = await client.post(
        "/api/auth/password-reset/confirm",
        json={"token": "some-token", "new_password": PASSWORD_OVER_72_BYTES},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/auth/magic-link/verify — Rate-Limit
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_magic_link_verify_rate_limited(client: AsyncClient):
    """Anfrage Nr. 21 in derselben Minute → 429 (moderates Limit, kein DB-Zugriff nötig)."""
    headers = {"x-real-ip": "203.0.113.201"}
    with patch(
        "app.routes.auth.consume_magic_link_token", new=AsyncMock(return_value=None)
    ):
        last_status = None
        for _ in range(21):
            r = await client.get(
                "/api/auth/magic-link/verify",
                params={"token": "invalid"},
                headers=headers,
            )
            last_status = r.status_code
        assert last_status == 429


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_without_cookie(client: AsyncClient):
    """Logout ohne Cookie: immer 200 (idempotent)."""
    r = await client.post("/api/auth/logout")
    assert r.status_code == 200
