"""Einfaches In-Memory Rate-Limiting pro IP (für Kontaktformular)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict

_buckets: dict[str, list[float]] = defaultdict(list)
_last_cleanup: float = 0.0
_lock = threading.Lock()
# Cleanup-Intervall: alle 5 Minuten abgelaufene IPs entfernen
_CLEANUP_INTERVAL = 300


def _cleanup_stale_buckets(now: float, window_seconds: int) -> None:
    """Entfernt IPs ohne aktive Einträge (Memory-Leak-Schutz). Muss unter _lock aufgerufen werden."""
    global _last_cleanup
    if now - _last_cleanup < _CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    cutoff = now - window_seconds
    stale_keys = [ip for ip, ts in _buckets.items() if not ts or ts[-1] < cutoff]
    for key in stale_keys:
        del _buckets[key]


def check_and_record(ip: str, max_requests: int, window_seconds: int) -> bool:
    """
    Erlaubt bis zu max_requests Anfragen im Zeitfenster window_seconds.
    Gibt False zurück, wenn das Limit überschritten wäre (kein Eintrag).
    Thread-sicher durch _lock.
    """
    now = time.time()
    cutoff = now - window_seconds
    with _lock:
        bucket = _buckets[ip]
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)
        if len(bucket) >= max_requests:
            return False
        bucket.append(now)
        _cleanup_stale_buckets(now, window_seconds)
    return True


def reset_for_tests() -> None:
    """Nur für Tests: Buckets leeren."""
    global _last_cleanup
    with _lock:
        _buckets.clear()
        _last_cleanup = 0.0
