"""Unit-Tests für app.services.content_db_service, die keine DB benötigen (#244, #249)."""

import pytest
from app.services.content_db_service import (
    _hash_content,
    content_cache_clear,
    get_game_content_from_db,
)


def test_hash_content_is_deterministic():
    content = {"chars": {"b": {"name": "B"}}, "laws": {"a": {"titel": "A"}}}
    assert _hash_content(content) == _hash_content(content)


def test_hash_content_ignores_dict_key_order():
    a = {"chars": {"x": 1, "y": 2}, "laws": {}}
    b = {"laws": {}, "chars": {"y": 2, "x": 1}}
    assert _hash_content(a) == _hash_content(b)


def test_hash_content_changes_with_content():
    a = {"chars": {"x": {"name": "Original"}}}
    b = {"chars": {"x": {"name": "Geändert"}}}
    assert _hash_content(a) != _hash_content(b)


def test_hash_content_is_short_hex_string():
    digest = _hash_content({"chars": {}})
    assert isinstance(digest, str)
    assert len(digest) == 16
    int(digest, 16)  # wirft ValueError, falls kein Hex


class _EmptyResult:
    """Steht für ein leeres SQLAlchemy-Result (weder Zeilen noch Mappings nötig,
    da diese Tests nur das Caching um `get_game_content_from_db` prüfen)."""

    def mappings(self):
        return []

    def __iter__(self):
        return iter([])


class _CountingSession:
    """Fake AsyncSession, die nur zählt, wie oft `execute()` aufgerufen wird."""

    def __init__(self):
        self.execute_calls = 0

    async def execute(self, *_args, **_kwargs):
        self.execute_calls += 1
        return _EmptyResult()


@pytest.mark.asyncio
async def test_get_game_content_from_db_second_call_uses_cache():
    """#249: Zwei aufeinanderfolgende Requests lösen keine erneuten Content-Queries aus."""
    content_cache_clear()
    session = _CountingSession()
    try:
        result1 = await get_game_content_from_db(session, "de")
        calls_after_first = session.execute_calls
        assert calls_after_first > 0

        result2 = await get_game_content_from_db(session, "de")
        assert session.execute_calls == calls_after_first
        assert result1 == result2
    finally:
        content_cache_clear()


@pytest.mark.asyncio
async def test_get_game_content_from_db_cache_invalidated_by_content_cache_clear():
    """#249: Nach `content_cache_clear()` (z.B. durch einen Admin-Write) wird frischer
    Content geliefert, d.h. die nächste Abfrage führt wieder Content-Queries aus."""
    content_cache_clear()
    session = _CountingSession()
    try:
        await get_game_content_from_db(session, "de")
        calls_after_first = session.execute_calls

        content_cache_clear()
        await get_game_content_from_db(session, "de")
        assert session.execute_calls > calls_after_first
    finally:
        content_cache_clear()


@pytest.mark.asyncio
async def test_get_game_content_from_db_caches_per_locale():
    """Der Cache-Key enthält die locale — de/en werden unabhängig gecacht."""
    content_cache_clear()
    session = _CountingSession()
    try:
        await get_game_content_from_db(session, "de")
        calls_after_de = session.execute_calls

        await get_game_content_from_db(session, "en")
        assert session.execute_calls > calls_after_de
    finally:
        content_cache_clear()
