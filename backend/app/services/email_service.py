"""E-Mail-Versand (Magic Link). Ohne SMTP-Konfiguration nur Logging."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_magic_link_email(to_email: str, verify_url: str) -> None:
    """Sendet Magic-Link-E-Mail oder loggt sie (kein SMTP)."""
    settings = get_settings()
    subject = "Dein Anmeldelink — Bundesrepublik"
    body = (
        "Hallo,\n\n"
        f"Klicke auf den folgenden Link, um dich anzumelden (15 Minuten gültig):\n\n{verify_url}\n\n"
        "Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.\n"
    )

    if not settings.smtp_host:
        logger.info("Magic Link (kein SMTP): an %s — %s", to_email, verify_url)
        return

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
