"""Error-Tracking (Sentry) und strukturierte Logs.

Beides ist rein konfigurationsgetrieben (siehe app.config.Settings) und wirkt
sich nicht auf den Anwendungscode aus, wenn SENTRY_DSN leer bleibt bzw.
DEBUG=true gesetzt ist.
"""

import logging

from app.config import Settings


def configure_logging(settings: Settings) -> None:
    """Konfiguriert das Root-Logging — JSON in Produktion, Klartext im Dev-Modus."""
    handler = logging.StreamHandler()
    if settings.effective_log_json:
        from pythonjsonlogger.json import JsonFormatter

        handler.setFormatter(
            JsonFormatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s",
                rename_fields={"asctime": "timestamp", "levelname": "level"},
            )
        )
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]


def configure_sentry(settings: Settings) -> None:
    """Initialisiert Sentry, sofern SENTRY_DSN gesetzt ist. Sonst No-Op."""
    if not settings.sentry_dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        send_default_pii=False,
    )
