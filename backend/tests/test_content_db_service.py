"""Unit-Tests für app.services.content_db_service, die keine DB benötigen (#244)."""

from app.services.content_db_service import _hash_content


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
