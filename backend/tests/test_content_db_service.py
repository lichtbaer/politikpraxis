"""Unit-Tests für app.services.content_db_service, die keine DB benötigen (#244, #249)."""

import pytest
from app.services.content_db_service import (
    CACHE_TTL,
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


def test_cache_ttl_is_short_worker_staleness_trade_off():
    """#249: Statt eines geteilten Caches (Redis/Pub-Sub) begrenzt eine kurze TTL
    das worker-übergreifende Staleness-Fenster nach einem Admin-Write auf einem
    anderen Worker bewusst auf wenige Sekunden statt bis zu 1h."""
    assert CACHE_TTL <= 120


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


# ---------------------------------------------------------------------------
# Qualitätsplan 2.2: Cache-Obergrenze, locale-abhängiger Cache-Key,
# deterministische Choice-Reihenfolge
# ---------------------------------------------------------------------------


def test_cache_is_bounded():
    """Cache-Keys enthalten Request-Parameter (z.B. ?type=…). Ohne Obergrenze
    könnte ein Client mit beliebig vielen Werten den Worker-Speicher füllen."""
    from app.services.content_db_service import (
        CACHE_MAX_ENTRIES,
        _content_cache,
        _get_cached,
        _set_cached,
    )

    content_cache_clear()
    try:
        for i in range(CACHE_MAX_ENTRIES * 3):
            _set_cached(("events", f"de:type_{i}"), i)
        assert len(_content_cache) <= CACHE_MAX_ENTRIES
        # Der jüngste Eintrag überlebt, der älteste ist verdrängt.
        assert (
            _get_cached(("events", f"de:type_{CACHE_MAX_ENTRIES * 3 - 1}")) is not None
        )
        assert _get_cached(("events", "de:type_0")) is None
    finally:
        content_cache_clear()


class _LocaleEchoSession:
    """Fake-Session: liefert für gesetz_relationen eine Zeile, deren Beschreibung
    die angefragte Locale enthält — so lässt sich Cache-Vergiftung erkennen."""

    async def execute(self, _stmt, params=None):
        locale = (params or {}).get("locale", "?")
        return [("g_a", "g_b", "requires", f"beschreibung-{locale}", None)]


@pytest.mark.asyncio
async def test_fetch_gesetz_relationen_caches_per_locale():
    """Vorher: Cache-Key ("gesetz_relationen", "all") — der erste Aufruf legte
    seine Sprache 60 s lang für alle anderen fest."""
    from app.services.content_db_service import fetch_gesetz_relationen

    content_cache_clear()
    try:
        de = await fetch_gesetz_relationen(_LocaleEchoSession(), "de")
        en = await fetch_gesetz_relationen(_LocaleEchoSession(), "en")
        assert de[0]["beschreibung"] == "beschreibung-de"
        assert en[0]["beschreibung"] == "beschreibung-en"
    finally:
        content_cache_clear()


class _MappingRows:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self._rows

    def __iter__(self):
        return iter([tuple(r.values()) for r in self._rows])


class _ChoiceOrderSession:
    """Simuliert eine DB, die event_choices_i18n in umgekehrter Reihenfolge
    liefert, sofern die Query kein ORDER BY choice_id enthält."""

    def __init__(self):
        self.executed: list[str] = []

    async def execute(self, stmt, params=None):
        sql = " ".join(str(stmt).split())
        self.executed.append(sql)
        if "FROM events_i18n" in sql:
            # "haushalt" liegt in der random_ids-Menge des Aggregators und landet
            # damit unter result["events"].
            return _MappingRows(
                [
                    {
                        "event_id": "haushalt",
                        "type_label": "T",
                        "title": "Titel",
                        "quote": "",
                        "context": "",
                        "ticker": "",
                    }
                ]
            )
        if "SELECT id, event_id FROM event_choices" in sql:
            return _MappingRows(
                [{"id": 1, "event_id": "haushalt"}, {"id": 2, "event_id": "haushalt"}]
            )
        if "FROM event_choices_i18n" in sql:
            rows = [
                {"choice_id": 1, "label": "erste", "desc": "", "log_msg": ""},
                {"choice_id": 2, "label": "zweite", "desc": "", "log_msg": ""},
            ]
            if "ORDER BY choice_id" not in sql:
                rows.reverse()
            return _MappingRows(rows)
        return _MappingRows([])


@pytest.mark.asyncio
async def test_game_content_choice_index_follows_choice_id():
    """Choice "0" muss die Choice mit der kleinsten ID sein — unabhängig davon,
    in welcher physischen Reihenfolge Postgres die Zeilen liefert."""
    content_cache_clear()
    try:
        session = _ChoiceOrderSession()
        content = await get_game_content_from_db(session, "de")
        assert any("ORDER BY choice_id" in sql for sql in session.executed)
        ev = content["events"]["haushalt"]
        assert ev["choices"]["0"]["label"] == "erste"
        assert ev["choices"]["1"]["label"] == "zweite"
    finally:
        content_cache_clear()
