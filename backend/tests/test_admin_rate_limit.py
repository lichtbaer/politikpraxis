"""
Tests für Admin-Rate-Limiting und Audit-Logging.
Keine DB erforderlich — reine Unit-Tests der Logik in routes/admin.py.
"""

import time
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

# ---------------------------------------------------------------------------
# admin_rate_limit: Sliding-Window-Logik
# ---------------------------------------------------------------------------


def _make_mock_request(
    ip: str = "1.2.3.4",
    *,
    real_ip: str | None = None,
    client_host: str | None = None,
) -> MagicMock:
    """Erstellt einen minimalen Mock-Request mit IP.

    Wenn real_ip gesetzt ist, liefert headers.get('x-real-ip') diesen Wert
    (wie nginx hinter dem Proxy). client_host steuert request.client.host.
    """
    req = MagicMock()
    host = (
        client_host
        if client_host is not None
        else (ip if real_ip is None else "10.0.0.254")
    )
    req.client = MagicMock()
    req.client.host = host

    headers: dict[str, str] = {}
    if real_ip is not None:
        headers["x-real-ip"] = real_ip
    elif client_host is None:
        # Legacy-Pfad: ohne X-Real-IP fällt client_ip auf request.client.host zurück
        pass

    def _header_get(name: str, default: str | None = None) -> str | None:
        return headers.get(name.lower(), default)

    req.headers.get = _header_get
    if real_ip is None and client_host is None:
        # Einfacher Fall: client.host = ip, kein X-Real-IP
        req.client.host = ip
    return req


@pytest.mark.asyncio
async def test_rate_limit_allows_first_request():
    """Erste Anfrage von einer IP wird durchgelassen."""
    from app.routes.admin import _admin_request_times, admin_rate_limit

    _admin_request_times.clear()
    req = _make_mock_request("10.0.0.1")
    # Darf keinen Fehler werfen
    await admin_rate_limit(req)


@pytest.mark.asyncio
async def test_rate_limit_blocks_after_limit():
    """Anfragen über dem Limit (30/min) werden mit 429 blockiert."""
    from app.routes.admin import (
        _ADMIN_RATE_LIMIT,
        _admin_request_times,
        admin_rate_limit,
    )

    _admin_request_times.clear()
    ip = "10.0.0.99"
    now = time.monotonic()
    # Simuliere _ADMIN_RATE_LIMIT Anfragen innerhalb der letzten Minute
    _admin_request_times[ip] = [now - 30] * _ADMIN_RATE_LIMIT

    req = _make_mock_request(ip)
    with pytest.raises(HTTPException) as exc_info:
        await admin_rate_limit(req)
    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers


@pytest.mark.asyncio
async def test_rate_limit_expires_old_requests():
    """Anfragen älter als 60 Sekunden werden nicht gezählt."""
    from app.routes.admin import (
        _ADMIN_RATE_LIMIT,
        _admin_request_times,
        admin_rate_limit,
    )

    _admin_request_times.clear()
    ip = "10.0.0.77"
    now = time.monotonic()
    # Befülle mit _ADMIN_RATE_LIMIT abgelaufenen Einträgen (> 60s alt)
    _admin_request_times[ip] = [now - 120] * _ADMIN_RATE_LIMIT

    req = _make_mock_request(ip)
    # Sollte KEIN 429 werfen, weil alle alten Einträge verfallen sind
    await admin_rate_limit(req)


@pytest.mark.asyncio
async def test_rate_limit_isolates_by_ip():
    """Rate-Limit ist IP-spezifisch — verschiedene IPs sind unabhängig."""
    from app.routes.admin import (
        _ADMIN_RATE_LIMIT,
        _admin_request_times,
        admin_rate_limit,
    )

    _admin_request_times.clear()
    ip_a = "10.0.0.1"
    ip_b = "10.0.0.2"
    now = time.monotonic()
    # IP A ist am Limit
    _admin_request_times[ip_a] = [now - 10] * _ADMIN_RATE_LIMIT

    req_b = _make_mock_request(ip_b)
    # IP B hat keine Rate-Limit-Probleme
    await admin_rate_limit(req_b)


@pytest.mark.asyncio
async def test_rate_limit_uses_x_real_ip_not_socket():
    """Limit-Key kommt von X-Real-IP, nicht von request.client.host (nginx-Proxy)."""
    from app.routes.admin import (
        _ADMIN_RATE_LIMIT,
        _admin_request_times,
        admin_rate_limit,
    )

    _admin_request_times.clear()
    real_a = "203.0.113.10"
    real_b = "203.0.113.20"
    nginx_ip = "172.18.0.5"
    now = time.monotonic()
    _admin_request_times[real_a] = [now - 5] * _ADMIN_RATE_LIMIT

    # Gleicher Socket (nginx), anderer X-Real-IP → eigener Bucket
    req_b = _make_mock_request(real_ip=real_b, client_host=nginx_ip)
    await admin_rate_limit(req_b)
    assert real_b in _admin_request_times
    assert len(_admin_request_times[real_b]) == 1

    # Gleicher X-Real-IP wie der volle Bucket → 429
    req_a = _make_mock_request(real_ip=real_a, client_host=nginx_ip)
    with pytest.raises(HTTPException) as exc_info:
        await admin_rate_limit(req_a)
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_rate_limit_cleanup_removes_stale_ips():
    """Stale IP-Keys ohne aktuelle Einträge werden periodisch entfernt."""
    from app.routes import admin as admin_mod

    admin_mod._admin_request_times.clear()
    admin_mod._last_cleanup = 0.0  # Cleanup erzwingen
    now = time.monotonic()
    stale_ip = "198.51.100.1"
    admin_mod._admin_request_times[stale_ip] = [now - 120]

    req = _make_mock_request("198.51.100.2")
    await admin_mod.admin_rate_limit(req)

    assert stale_ip not in admin_mod._admin_request_times
    assert "198.51.100.2" in admin_mod._admin_request_times


# ---------------------------------------------------------------------------
# admin_audit_log: Logging für Schreib-Operationen
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_audit_log_logs_post(caplog):
    """POST-Anfragen werden im Audit-Log protokolliert."""
    import logging

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
    import logging

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
    import logging

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
    import logging

    from app.routes.admin import admin_audit_log

    req = MagicMock()
    req.method = "DELETE"
    req.url.path = "/api/admin/events/test_event"

    with caplog.at_level(logging.INFO, logger="bundesrepublik.admin.audit"):
        await admin_audit_log(req, admin_user="admin")

    assert any("DELETE" in r.message for r in caplog.records)
