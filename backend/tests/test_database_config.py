"""Tests für die Connection-Pool-Konfiguration der DB-Engine (#251)."""

from app.config import get_settings
from app.db.database import engine


def test_engine_pool_configured_from_settings():
    """pool_size/max_overflow/pool_recycle folgen den Settings, kein SQLAlchemy-Default."""
    settings = get_settings()
    pool = engine.pool

    assert pool.size() == settings.db_pool_size
    assert pool._max_overflow == settings.db_max_overflow
    assert pool._recycle == settings.db_pool_recycle_seconds


def test_engine_pool_pre_ping_enabled():
    """pool_pre_ping verhindert stale Connections nach DB-Neustarts/Idle-Timeouts."""
    assert engine.pool._pre_ping is True
