"""
Unit-Tests für auth_service.py — nur reine/sync Funktionen, kein DB erforderlich.
"""

import time
from uuid import UUID

import pytest
from app.config import get_settings
from app.services.auth_service import (
    _parse_refresh_cookie,
    _refresh_cookie_value,
    create_access_token,
    decode_token,
    validate_password_strength,
)
from fastapi import HTTPException
from jose import jwt

settings = get_settings()


# ---------------------------------------------------------------------------
# create_access_token / decode_token
# ---------------------------------------------------------------------------


def test_create_access_token_returns_string():
    token = create_access_token("test-user-id")
    assert isinstance(token, str)
    assert len(token) > 10


def test_create_access_token_encodes_sub():
    user_id = "abc-123"
    token = create_access_token(user_id)
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    assert payload["sub"] == user_id


def test_decode_token_returns_user_id():
    user_id = "some-user"
    token = create_access_token(user_id)
    result = decode_token(token)
    assert result == user_id


def test_decode_token_invalid_returns_none():
    result = decode_token("not.a.valid.token")
    assert result is None


def test_decode_token_expired_returns_none():
    now = int(time.time())
    expired_payload = {"sub": "user-x", "exp": now - 9999, "iat": now - 10000}
    expired_token = jwt.encode(
        expired_payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    result = decode_token(expired_token)
    assert result is None


def test_decode_token_wrong_secret_returns_none():
    now = int(time.time())
    payload = {"sub": "user-y", "exp": now + 3600, "iat": now}
    token_with_wrong_secret = jwt.encode(
        payload, "wrong-secret", algorithm=settings.algorithm
    )
    result = decode_token(token_with_wrong_secret)
    assert result is None


# ---------------------------------------------------------------------------
# validate_password_strength
# ---------------------------------------------------------------------------


def test_validate_password_strength_too_short_raises():
    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("kurz")
    assert exc_info.value.status_code == 400


def test_validate_password_strength_exactly_7_raises():
    with pytest.raises(HTTPException):
        validate_password_strength("1234567")


def test_validate_password_strength_exactly_8_ok():
    validate_password_strength("12345678")  # kein Exception


def test_validate_password_strength_long_ok():
    validate_password_strength("ein-sehr-langes-passwort-123")  # kein Exception


def test_validate_password_strength_exactly_72_bytes_ok():
    validate_password_strength("a" * 72)  # kein Exception


def test_validate_password_strength_73_bytes_raises():
    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("a" * 73)
    assert exc_info.value.status_code == 400


def test_validate_password_strength_multibyte_over_72_bytes_raises():
    """37 Umlaute (2 Byte je Zeichen UTF-8) = 74 Byte, aber nur 37 Zeichen."""
    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("ü" * 37)
    assert exc_info.value.status_code == 400


def test_validate_password_strength_multibyte_under_72_bytes_ok():
    """35 Umlaute = 70 Byte — bleibt unter der bcrypt-Grenze."""
    validate_password_strength("ü" * 35)  # kein Exception


# ---------------------------------------------------------------------------
# app.auth.security — verify_secret / hash_secret Grenzfälle
# ---------------------------------------------------------------------------


def test_verify_secret_over_72_bytes_returns_false_not_raise():
    """bcrypt wirft ValueError für >72 Byte — verify_secret fängt das ab."""
    from app.auth.security import hash_secret, verify_secret

    hashed = hash_secret("normales-passwort")
    assert verify_secret("a" * 100, hashed) is False


def test_verify_secret_correct_password_still_matches():
    from app.auth.security import hash_secret, verify_secret

    hashed = hash_secret("korrektes-passwort-123")
    assert verify_secret("korrektes-passwort-123", hashed) is True
    assert verify_secret("falsches-passwort", hashed) is False


# ---------------------------------------------------------------------------
# _parse_refresh_cookie
# ---------------------------------------------------------------------------


def test_parse_refresh_cookie_none_returns_none():
    assert _parse_refresh_cookie(None) is None


def test_parse_refresh_cookie_no_dot_returns_none():
    assert _parse_refresh_cookie("keinpunkt") is None


def test_parse_refresh_cookie_invalid_uuid_returns_none():
    assert _parse_refresh_cookie("kein-uuid.secret") is None


def test_parse_refresh_cookie_valid_returns_tuple():
    rt_id = UUID("12345678-1234-5678-1234-567812345678")
    result = _parse_refresh_cookie(f"{rt_id}.mein-secret")
    assert result is not None
    parsed_id, secret = result
    assert parsed_id == rt_id
    assert secret == "mein-secret"


def test_parse_refresh_cookie_secret_with_dot_uses_first_split():
    """Partition bei erstem Punkt: alles danach ist der Secret."""
    rt_id = UUID("12345678-1234-5678-1234-567812345678")
    result = _parse_refresh_cookie(f"{rt_id}.part1.part2")
    assert result is not None
    _, secret = result
    assert secret == "part1.part2"


# ---------------------------------------------------------------------------
# _refresh_cookie_value
# ---------------------------------------------------------------------------


def test_refresh_cookie_value_format():
    rt_id = UUID("aaaabbbb-cccc-dddd-eeee-ffffffffffff")
    secret = "my-secret-value"
    result = _refresh_cookie_value(rt_id, secret)
    assert result == f"{rt_id}.{secret}"
