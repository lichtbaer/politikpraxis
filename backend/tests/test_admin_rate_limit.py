"""
Tests für Admin-Rate-Limiting und Audit-Logging.
Keine DB erforderlich — reine Unit-Tests der Logik in routes/admin.py.
"""

import time
from collections import defaultdict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# admin_rate_limit: Sliding-Window-Logik
# ---------------------------------------------------------------------------


def _make_mock_request(ip: str = "1.2.3.4") -> MagicMock:
    """Erstellt einen minimalen Mock-Request mit IP."""
    req = MagicMock()
    req.client = MagicMock()
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
    from app.routes.admin import _ADMIN_RATE_LIMIT, _admin_request_times, admin_rate_limit

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
    from app.routes.admin import _ADMIN_RATE_LIMIT, _admin_request_times, admin_rate_limit

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
    from app.routes.admin import _ADMIN_RATE_LIMIT, _admin_request_times, admin_rate_limit

    _admin_request_times.clear()
    ip_a = "10.0.0.1"
    ip_b = "10.0.0.2"
    now = time.monotonic()
    # IP A ist am Limit
    _admin_request_times[ip_a] = [now - 10] * _ADMIN_RATE_LIMIT

    req_b = _make_mock_request(ip_b)
    # IP B hat keine Rate-Limit-Probleme
    await admin_rate_limit(req_b)


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
