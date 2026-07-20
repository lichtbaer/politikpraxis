"""
slowapi hinter Reverse-Proxy: Limits pro X-Real-IP, nicht pro Socket-IP.

Login hat Limit 5/minute. authenticate_user wird gemockt, damit kein DB nötig ist.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, status
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_rate_limit_isolates_by_x_real_ip(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Unterschiedliche X-Real-IP-Header zählen getrennt (simuliert nginx)."""
    import app.routes.auth as auth_routes

    async def _reject(*_args, **_kwargs):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige Zugangsdaten",
        )

    monkeypatch.setattr(auth_routes, "authenticate_user", _reject)
    # get_db trotzdem nicht treffen: authenticate_user wird vor DB-Nutzung
    # nach dem Limit-Check aufgerufen — Session-Dependency läuft trotzdem.
    # Daher auch DB-Dependency absichern.
    from app.db import database as db_mod

    async def _fake_db():
        yield AsyncMock()

    monkeypatch.setattr(db_mod, "get_db", _fake_db)
    # FastAPI hat get_db bereits gebunden — Override über app.dependency_overrides
    from app.main import app

    app.dependency_overrides[db_mod.get_db] = _fake_db
    try:
        body = {"email": "nobody@example.com", "password": "wrong-password-xx"}

        for _ in range(5):
            r = await client.post(
                "/api/auth/login",
                json=body,
                headers={"X-Real-IP": "203.0.113.1"},
            )
            assert r.status_code == 401, r.text

        r_blocked = await client.post(
            "/api/auth/login",
            json=body,
            headers={"X-Real-IP": "203.0.113.1"},
        )
        assert r_blocked.status_code == 429

        r_other = await client.post(
            "/api/auth/login",
            json=body,
            headers={"X-Real-IP": "203.0.113.2"},
        )
        assert r_other.status_code == 401, r_other.text
    finally:
        app.dependency_overrides.pop(db_mod.get_db, None)


@pytest.mark.asyncio
async def test_limiter_key_func_is_client_ip():
    """Limiter nutzt client_ip als key_func (Regression gegen get_remote_address)."""
    from app.dependencies import client_ip
    from app.limiter import limiter

    assert limiter._key_func is client_ip


@pytest.mark.asyncio
async def test_client_ip_prefers_x_real_ip():
    """client_ip bevorzugt X-Real-IP gegenüber request.client.host."""
    from unittest.mock import MagicMock

    from app.dependencies import client_ip

    req = MagicMock()
    req.headers.get = lambda name, default=None: (
        "203.0.113.9" if name == "x-real-ip" else default
    )
    req.client = MagicMock()
    req.client.host = "172.18.0.5"
    assert client_ip(req) == "203.0.113.9"
