"""Kontaktformular: serverseitiger Mailversand via SMTP."""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request, status
from pydantic import ValidationError

from app.config import get_settings
from app.schemas.kontakt import KontaktAnfrage, KontaktResponse
from app.services.rate_limit import check_and_record

logger = logging.getLogger(__name__)
router = APIRouter()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _send_smtp_sync(
    *,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_use_tls: bool,
    mail_from: str,
    recipient: str,
    subject: str,
    reply_to: str,
    body: str,
) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["From"] = mail_from or smtp_user
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Reply-To"] = reply_to

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        if smtp_user:
            smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)


@router.post("/kontakt", response_model=KontaktResponse)
async def kontakt_senden(
    request: Request, body: dict[str, Any] = Body(...)
) -> KontaktResponse:
    website = (body.get("website") or "").strip()
    if website:
        return KontaktResponse(success=True)

    try:
        anfrage = KontaktAnfrage.model_validate(body)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.errors()
        ) from e

    ip = _client_ip(request)
    if not check_and_record(ip, max_requests=3, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.",
        )

    settings = get_settings()
    if not (
        settings.smtp_host
        and settings.smtp_user
        and settings.smtp_password
        and settings.contact_recipient
    ):
        logger.error(
            "Kontaktformular: SMTP nicht konfiguriert (Umgebungsvariablen fehlen)"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Kontaktformular vorübergehend nicht verfügbar.",
        )

    subject = f"[Politikpraxis] {anfrage.betreff} — {anfrage.name}"
    text_body = (
        f"Von: {anfrage.name} <{anfrage.email}>\n"
        f"Betreff: {anfrage.betreff}\n\n"
        f"{anfrage.nachricht}\n\n"
        f"---\n"
        f"Gesendet über politikpraxis.de/kontakt\n"
        f"IP: {ip}\n"
    )

    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            smtp_host=settings.smtp_host,
            smtp_port=settings.smtp_port,
            smtp_user=settings.smtp_user,
            smtp_password=settings.smtp_password,
            smtp_use_tls=settings.smtp_use_tls,
            mail_from=settings.mail_from,
            recipient=settings.contact_recipient,
            subject=subject,
            reply_to=str(anfrage.email),
            body=text_body,
        )
    except Exception as e:
        logger.exception("SMTP Fehler: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mail konnte nicht gesendet werden.",
        ) from e

    return KontaktResponse(success=True)
