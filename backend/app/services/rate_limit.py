"""Einfaches In-Memory Rate-Limiting pro IP (für Kontaktformular)."""

from __future__ import annotations

import time
from collections import defaultdict

_buckets: dict[str, list[float]] = defaultdict(list)


def check_and_record(ip: str, max_requests: int, window_seconds: int) -> bool:
    """
    Erlaubt bis zu max_requests Anfragen im Zeitfenster window_seconds.
    Gibt False zurück, wenn das Limit überschritten wäre (kein Eintrag).
    """
    now = time.time()
    cutoff = now - window_seconds
    bucket = _buckets[ip]
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= max_requests:
        return False
    bucket.append(now)
    return True


def reset_for_tests() -> None:
    """Nur für Tests: Buckets leeren."""
    _buckets.clear()
