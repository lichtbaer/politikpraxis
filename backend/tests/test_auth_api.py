"""
Route-Tests für /api/auth/* — die meisten Tests benötigen keine Datenbank
(400/422-Validierungsfehler, 401-Auth-Fehler).
"""

import uuid
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
@requires_db
async def test_register_password_73_bytes_returns_400_not_500(client: AsyncClient):
    """Passwort > 72 Byte (bcrypt-Grenze) → sauberer 400, kein 500."""
    email = f"{uuid.uuid4()}@example.com"
    r = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "a" * 73},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
@requires_db
async def test_register_password_exactly_72_bytes_succeeds(client: AsyncClient):
    """Passwort mit genau 72 Byte ist noch gültig."""
    email = f"{uuid.uuid4()}@example.com"
    r = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "a" * 72},
    )
    assert r.status_code == 200


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
async def test_login_password_over_max_length_returns_422(client: AsyncClient):
    """Passwort > 128 Zeichen → 422 (Pydantic max_length, wie bei Register)."""
    r = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "a" * 129},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
@requires_db
async def test_login_password_73_bytes_returns_401_not_500(client: AsyncClient):
    """Passwort > 72 Byte bei existierendem Account → 401 (wie falsches Passwort), kein 500."""
    email = f"{uuid.uuid4()}@example.com"
    register = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "korrektes-passwort-123"},
    )
    assert register.status_code == 200

    r = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "a" * 73},
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


@pytest.mark.asyncio
async def test_magic_link_verify_is_rate_limited(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """GET /magic-link/verify: Limit 20/Minute pro IP, danach 429 statt DB-Last."""
    import app.routes.auth as auth_routes
    from app.db import database as db_mod
    from app.main import app

    async def _invalid_token(*_args, **_kwargs):
        return None

    async def _fake_db():
        yield AsyncMock()

    monkeypatch.setattr(auth_routes, "consume_magic_link_token", _invalid_token)
    app.dependency_overrides[db_mod.get_db] = _fake_db
    try:
        headers = {"X-Real-IP": "203.0.113.42"}
        for _ in range(20):
            r = await client.get(
                "/api/auth/magic-link/verify",
                params={"token": "invalid-token"},
                headers=headers,
            )
            assert r.status_code == 400, r.text

        r_blocked = await client.get(
            "/api/auth/magic-link/verify",
            params={"token": "invalid-token"},
            headers=headers,
        )
        assert r_blocked.status_code == 429
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
