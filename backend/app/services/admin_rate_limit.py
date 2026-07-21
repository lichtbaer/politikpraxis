"""DB-gestütztes Rate-Limiting für Admin-Endpunkte (#231).

Vorher: In-Memory-Sliding-Window pro Prozess (siehe git-history von
routes/admin.py). Bei mehreren Worker-Prozessen/Instanzen hinter einem
Load-Balancer zählte jede Instanz separat — das Limit war umgehbar, und ein
Neustart löschte alle Zähler.

Jetzt: Ein Fixed-Window-Zähler pro IP in Postgres, atomar per
INSERT ... ON CONFLICT fortgeschrieben. Das Fenster ist auf ADMIN_WINDOW_SECONDS
gerastert (nicht gleitend) — an der Fenstergrenze sind kurzzeitig knapp doppelt
so viele Anfragen möglich wie das Sliding-Window vorher erlaubt hätte. Für ein
Brute-Force-Limit auf Admin-Endpunkten ist das ein bewusster, dokumentierter
Trade-off gegen die Einfachheit einer einzigen atomaren SQL-Anweisung (kein
Read-Modify-Write, keine Race Conditions zwischen Workern).
"""

from __future__ import annotations

import random
import time

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

ADMIN_RATE_LIMIT = 30  # Anfragen pro Fenster
ADMIN_WINDOW_SECONDS = 60
# Stale Buckets (IPs ohne Anfragen seit mehreren Fenstern) werden nicht bei
# jeder Anfrage aufgeräumt, sondern nur mit geringer Wahrscheinlichkeit, um
# einen zusätzlichen DB-Roundtrip pro Request zu vermeiden.
_CLEANUP_PROBABILITY = 0.01
_STALE_AFTER_WINDOWS = 10


async def check_admin_rate_limit(
    db: AsyncSession, ip: str, *, now: float | None = None
) -> tuple[bool, int]:
    """Registriert eine Anfrage der IP im aktuellen Fenster und prüft das Limit.

    Gibt (allowed, count) zurück. Committet die Zählung sofort (unabhängig vom
    Ausgang der restlichen Request-Verarbeitung), damit auch fehlschlagende
    Anfragen zum Limit zählen.
    """
    effective_now = now if now is not None else time.time()
    window_start = int(effective_now // ADMIN_WINDOW_SECONDS) * ADMIN_WINDOW_SECONDS

    result = await db.execute(
        sa.text(
            """
            INSERT INTO admin_rate_limit_bucket (ip, window_start, count)
            VALUES (:ip, :window_start, 1)
            ON CONFLICT (ip) DO UPDATE SET
                count = CASE
                    WHEN admin_rate_limit_bucket.window_start = :window_start
                    THEN admin_rate_limit_bucket.count + 1
                    ELSE 1
                END,
                window_start = :window_start
            RETURNING count
            """
        ),
        {"ip": ip, "window_start": window_start},
    )
    count = result.scalar_one()
    await db.commit()

    if random.random() < _CLEANUP_PROBABILITY:
        await _cleanup_stale_buckets(db, window_start)

    return count <= ADMIN_RATE_LIMIT, count


async def _cleanup_stale_buckets(db: AsyncSession, current_window_start: int) -> None:
    """Entfernt Buckets, die seit mehreren Fenstern keine Anfrage mehr hatten."""
    cutoff = current_window_start - _STALE_AFTER_WINDOWS * ADMIN_WINDOW_SECONDS
    await db.execute(
        sa.text("DELETE FROM admin_rate_limit_bucket WHERE window_start < :cutoff"),
        {"cutoff": cutoff},
    )
    await db.commit()
