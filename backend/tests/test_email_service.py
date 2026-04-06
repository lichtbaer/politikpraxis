"""
Tests für email_service — Retry-Logik und SMTP-Konfigurationsprüfung.
Kein echter SMTP-Server erforderlich (Mock).
"""

import asyncio
import smtplib
from email.message import EmailMessage
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# _send_with_retry
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_with_retry_succeeds_on_first_try():
    """Erfolgreiches Senden beim ersten Versuch — kein Retry."""
    from app.services.email_service import _send_with_retry

    msg = EmailMessage()
    msg["Subject"] = "Test"
    msg["From"] = "from@test.com"
    msg["To"] = "to@test.com"
    msg.set_content("body")

    with patch("app.services.email_service.asyncio.to_thread", new_callable=AsyncMock) as mock_thread:
        await _send_with_retry(msg)
        assert mock_thread.call_count == 1


@pytest.mark.asyncio
async def test_send_with_retry_retries_on_failure():
    """Bei Netzwerkfehler: bis zu 3 Versuche."""
    from app.services.email_service import _SMTP_MAX_RETRIES, _send_with_retry

    msg = EmailMessage()
    msg["Subject"] = "Retry Test"
    msg["From"] = "from@test.com"
    msg["To"] = "to@test.com"
    msg.set_content("body")

    call_count = 0

    async def failing_then_succeed(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < _SMTP_MAX_RETRIES:
            raise smtplib.SMTPException("Transient error")

    with (
        patch("app.services.email_service.asyncio.to_thread", side_effect=failing_then_succeed),
        patch("app.services.email_service.asyncio.sleep", new_callable=AsyncMock),
    ):
        await _send_with_retry(msg)

    assert call_count == _SMTP_MAX_RETRIES


@pytest.mark.asyncio
async def test_send_with_retry_raises_after_all_retries():
    """Nach _SMTP_MAX_RETRIES Fehlversuchen → HTTP 503."""
    from app.services.email_service import _send_with_retry

    msg = EmailMessage()
    msg["Subject"] = "Always Fail"
    msg["From"] = "from@test.com"
    msg["To"] = "to@test.com"
    msg.set_content("body")

    async def always_fail(*args, **kwargs):
        raise smtplib.SMTPException("Server down")

    with (
        patch("app.services.email_service.asyncio.to_thread", side_effect=always_fail),
        patch("app.services.email_service.asyncio.sleep", new_callable=AsyncMock),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await _send_with_retry(msg)

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_send_with_retry_uses_exponential_backoff():
    """Backoff-Delays werden verdoppelt: 2s, 4s."""
    from app.services.email_service import _SMTP_RETRY_BASE_DELAY, _send_with_retry

    msg = EmailMessage()
    msg["Subject"] = "Backoff Test"
    msg["From"] = "from@test.com"
    msg["To"] = "to@test.com"
    msg.set_content("body")

    sleep_calls: list[float] = []

    async def mock_sleep(delay: float):
        sleep_calls.append(delay)

    async def always_fail(*args, **kwargs):
        raise smtplib.SMTPException("fail")

    with (
        patch("app.services.email_service.asyncio.to_thread", side_effect=always_fail),
        patch("app.services.email_service.asyncio.sleep", side_effect=mock_sleep),
    ):
        with pytest.raises(HTTPException):
            await _send_with_retry(msg)

    # Erste Pause: base_delay * 1, zweite: base_delay * 2
    assert len(sleep_calls) == 2
    assert sleep_calls[0] == pytest.approx(_SMTP_RETRY_BASE_DELAY)
    assert sleep_calls[1] == pytest.approx(_SMTP_RETRY_BASE_DELAY * 2)


# ---------------------------------------------------------------------------
# send_magic_link_email — ohne SMTP-Config: 503
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_magic_link_email_no_smtp_raises_503():
    """Ohne SMTP-Config → HTTP 503 (kein Retry nötig)."""
    from app.services.email_service import send_magic_link_email

    with patch("app.services.email_service.get_settings") as mock_settings:
        mock_settings.return_value.smtp_host = ""
        mock_settings.return_value.mail_from = "noreply@test.com"

        with pytest.raises(HTTPException) as exc_info:
            await send_magic_link_email("user@example.com", "http://example.com/verify?token=abc")

    assert exc_info.value.status_code == 503
