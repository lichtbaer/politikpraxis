"""E-Mail-Versand (Magic Link, Passwort-Reset)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)

_SMTP_MAX_RETRIES = 3
_SMTP_RETRY_BASE_DELAY = 2.0  # Sekunden (exponentiell: 2, 4, 8)


async def _send_with_retry(msg: EmailMessage) -> None:
    """Sendet E-Mail mit bis zu _SMTP_MAX_RETRIES Versuchen (exponentielles Backoff)."""
    settings = get_settings()

    def _send_sync() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)

    last_error: Exception | None = None
    for attempt in range(1, _SMTP_MAX_RETRIES + 1):
        try:
            await asyncio.to_thread(_send_sync)
            return
        except Exception as exc:
            last_error = exc
            if attempt < _SMTP_MAX_RETRIES:
                delay = _SMTP_RETRY_BASE_DELAY * (2 ** (attempt - 1))
                logger.warning(
                    "SMTP-Versuch %d/%d fehlgeschlagen (%s) — Retry in %.0fs",
                    attempt,
                    _SMTP_MAX_RETRIES,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "SMTP endgültig fehlgeschlagen nach %d Versuchen: %s",
                    _SMTP_MAX_RETRIES,
                    exc,
                )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.",
    ) from last_error


async def send_magic_link_email(to_email: str, verify_url: str) -> None:
    """Sendet Magic-Link-E-Mail. Ohne SMTP: 503 (konsistent mit Passwort-Reset)."""
    settings = get_settings()
    subject = "Dein Anmeldelink — Bundesrepublik"
    body = (
        "Hallo,\n\n"
        f"Klicke auf den folgenden Link, um dich anzumelden (15 Minuten gültig):\n\n{verify_url}\n\n"
        "Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.\n"
    )

    if not settings.smtp_host:
        logger.warning(
            "Magic Link nicht gesendet (SMTP nicht konfiguriert): %s", to_email
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="E-Mail-Versand ist nicht konfiguriert",
        )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.mail_from
    msg["To"] = to_email
    msg.set_content(body)

    await _send_with_retry(msg)


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Sendet Passwort-Reset-Mail. Ohne SMTP: 503 (kein stilles Ausweichen)."""
    settings = get_settings()
    subject = "Passwort zurücksetzen — Politikpraxis"
    body = (
        "Hallo,\n\n"
        "du hast einen Passwort-Reset für dein Politikpraxis-Konto angefordert.\n\n"
        "Klicke auf den folgenden Link um ein neues Passwort zu setzen:\n"
        f"{reset_url}\n\n"
        "Dieser Link ist 30 Minuten gültig und kann nur einmal verwendet werden.\n\n"
        "Falls du keinen Reset angefordert hast, kannst du diese Mail ignorieren.\n\n"
        "— Das Politikpraxis-Team\n"
    )

    if not settings.smtp_host:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="E-Mail-Versand ist nicht konfiguriert",
        )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.mail_from
    msg["To"] = to_email
    msg.set_content(body)

    await _send_with_retry(msg)
