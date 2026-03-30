"""E-Mail-Versand (Magic Link, Passwort-Reset)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)


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

    def _send_sync() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)

    await asyncio.to_thread(_send_sync)


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

    def _send_sync() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)

    await asyncio.to_thread(_send_sync)
