"""
Tests für Admin-Rate-Limiting (#231) und Audit-Logging.

Die Rate-Limit-Logik liegt jetzt in Postgres (app.services.admin_rate_limit)
statt im Prozess-Speicher — die Tests dafür brauchen eine echte DB-Verbindung
(@requires_db). Das Audit-Logging bleibt reine In-Process-Logik.
"""

import logging
from unittest.mock import MagicMock

import pytest
import sqlalchemy as sa
from app.db.database import async_session
from app.services.admin_rate_limit import (
    ADMIN_RATE_LIMIT,
    ADMIN_WINDOW_SECONDS,
    check_admin_rate_limit,
)
from httpx import ASGITransport, AsyncClient
from tests.conftest import requires_db


@pytest.fixture(autouse=True)
async def _fresh_engine_pool():
    """Verwirft gepoolte Connections vor jedem Test.

    pytest-asyncio öffnet pro Testfunktion eine neue Event-Loop; asyncpg-
    Connections sind an die Loop gebunden, in der sie erzeugt wurden. Ohne
    Dispose würde der nächste Test versuchen, eine Connection der vorherigen
    (inzwischen geschlossenen) Loop wiederzuverwenden.
    """
    from app.db.database import engine

    await engine.dispose()
    yield


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


async def _clear_bucket(*ips: str) -> None:
    async with async_session() as db:
        if ips:
            await db.execute(
                sa.text("DELETE FROM admin_rate_limit_bucket WHERE ip = ANY(:ips)"),
                {"ips": list(ips)},
            )
        else:
            await db.execute(sa.text("DELETE FROM admin_rate_limit_bucket"))
        await db.commit()


# ---------------------------------------------------------------------------
# check_admin_rate_limit: Fixed-Window-Logik (DB-gestützt)
# ---------------------------------------------------------------------------


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_allows_first_request():
    """Erste Anfrage von einer IP wird durchgelassen."""
    ip = "10.0.0.1"
    await _clear_bucket(ip)
    async with async_session() as db:
        allowed, count = await check_admin_rate_limit(db, ip)
    assert allowed
    assert count == 1


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_blocks_after_limit():
    """Anfragen über dem Limit (30/Fenster) werden blockiert."""
    ip = "10.0.0.99"
    await _clear_bucket(ip)
    now = 1_700_000_000.0
    async with async_session() as db:
        for _ in range(ADMIN_RATE_LIMIT):
            allowed, _ = await check_admin_rate_limit(db, ip, now=now)
            assert allowed
        allowed, count = await check_admin_rate_limit(db, ip, now=now)
    assert not allowed
    assert count == ADMIN_RATE_LIMIT + 1


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_expires_old_requests():
    """Ein neues Fenster setzt den Zähler zurück, statt weiter zu akkumulieren."""
    ip = "10.0.0.77"
    await _clear_bucket(ip)
    now = 1_700_000_000.0
    async with async_session() as db:
        for _ in range(ADMIN_RATE_LIMIT):
            await check_admin_rate_limit(db, ip, now=now)
        # Deutlich im nächsten Fenster
        allowed, count = await check_admin_rate_limit(
            db, ip, now=now + ADMIN_WINDOW_SECONDS * 2
        )
    assert allowed
    assert count == 1


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_isolates_by_ip():
    """Rate-Limit ist IP-spezifisch — verschiedene IPs sind unabhängig."""
    ip_a, ip_b = "10.0.0.1", "10.0.0.2"
    await _clear_bucket(ip_a, ip_b)
    now = 1_700_000_000.0
    async with async_session() as db:
        for _ in range(ADMIN_RATE_LIMIT):
            await check_admin_rate_limit(db, ip_a, now=now)
        allowed, count = await check_admin_rate_limit(db, ip_b, now=now)
    assert allowed
    assert count == 1


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_shared_across_sessions():
    """Zwei unabhängige DB-Sessions (Stand-in für zwei Worker-Prozesse) teilen
    sich denselben Zähler — genau das In-Memory-Verhalten nicht garantierte."""
    ip = "10.0.0.42"
    await _clear_bucket(ip)
    now = 1_700_000_000.0

    async with async_session() as db_worker_1:
        for _ in range(ADMIN_RATE_LIMIT):
            await check_admin_rate_limit(db_worker_1, ip, now=now)

    # Ein "zweiter Worker" mit eigener Session sieht denselben Zählerstand.
    async with async_session() as db_worker_2:
        allowed, count = await check_admin_rate_limit(db_worker_2, ip, now=now)
    assert not allowed
    assert count == ADMIN_RATE_LIMIT + 1


@requires_db
@pytest.mark.asyncio
async def test_rate_limit_cleanup_removes_stale_buckets():
    """Buckets ohne Anfragen seit vielen Fenstern werden aufgeräumt."""
    from app.services.admin_rate_limit import _cleanup_stale_buckets

    stale_ip = "198.51.100.1"
    fresh_ip = "198.51.100.2"
    await _clear_bucket(stale_ip, fresh_ip)
    old_window = 1_000_000
    current_window = old_window + 100 * ADMIN_WINDOW_SECONDS

    async with async_session() as db:
        await check_admin_rate_limit(db, stale_ip, now=float(old_window))
        await check_admin_rate_limit(db, fresh_ip, now=float(current_window))
        await _cleanup_stale_buckets(db, current_window)

        result = await db.execute(
            sa.text("SELECT ip FROM admin_rate_limit_bucket WHERE ip = ANY(:ips)"),
            {"ips": [stale_ip, fresh_ip]},
        )
        remaining = {row[0] for row in result.all()}

    assert stale_ip not in remaining
    assert fresh_ip in remaining


# ---------------------------------------------------------------------------
# admin_rate_limit (FastAPI-Dependency): HTTP-Ebene über den Admin-Router
# ---------------------------------------------------------------------------


@requires_db
@pytest.mark.asyncio
async def test_admin_rate_limit_dependency_blocks_after_limit(monkeypatch):
    """Über den echten Admin-Router: Anfrage Nr. 31 in derselben Minute → 429."""
    from app.config import get_settings
    from app.main import app

    monkeypatch.setenv("ADMIN_USER", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test")
    get_settings.cache_clear()

    ip = "203.0.113.55"
    await _clear_bucket(ip)
    headers = {"x-real-ip": ip}
    auth = ("admin", "test")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        last_status = None
        for _ in range(ADMIN_RATE_LIMIT + 1):
            resp = await client.get("/api/admin/chars", headers=headers, auth=auth)
            last_status = resp.status_code
        assert last_status == 429
        assert "Retry-After" in resp.headers

    get_settings.cache_clear()
    await _clear_bucket(ip)


# ---------------------------------------------------------------------------
# admin_audit_log: Logging für Schreib-Operationen (unverändert, In-Process)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_audit_log_logs_post(caplog):
    """POST-Anfragen werden im Audit-Log protokolliert."""
    from app.routes.admin import admin_audit_log

    req = MagicMock()
    req.method = "POST"
    req.url.path = "/api/admin/gesetze"

    with caplog.at_level(logging.INFO, logger="bundesrepublik.admin.audit"):
        await admin_audit_log(req, admin_user="testadmin")

    assert any("ADMIN_WRITE" in r.message for r in caplog.records)
    assert any("testadmin" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_audit_log_does_not_log_get(caplog):
    """GET-Anfragen werden NICHT im Audit-Log protokolliert."""
    from app.routes.admin import admin_audit_log

    req = MagicMock()
    req.method = "GET"
    req.url.path = "/api/admin/gesetze"

    with caplog.at_level(logging.INFO, logger="bundesrepublik.admin.audit"):
        await admin_audit_log(req, admin_user="testadmin")

    assert not any("ADMIN_WRITE" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_audit_log_logs_put(caplog):
    """PUT-Anfragen werden protokolliert."""
    from app.routes.admin import admin_audit_log

    req = MagicMock()
    req.method = "PUT"
    req.url.path = "/api/admin/chars/kanzler"

    with caplog.at_level(logging.INFO, logger="bundesrepublik.admin.audit"):
        await admin_audit_log(req, admin_user="admin")

    assert any("PUT" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_audit_log_logs_delete(caplog):
    """DELETE-Anfragen werden protokolliert."""
    from app.routes.admin import admin_audit_log

    req = MagicMock()
    req.method = "DELETE"
    req.url.path = "/api/admin/events/test_event"

    with caplog.at_level(logging.INFO, logger="bundesrepublik.admin.audit"):
        await admin_audit_log(req, admin_user="admin")

    assert any("DELETE" in r.message for r in caplog.records)
