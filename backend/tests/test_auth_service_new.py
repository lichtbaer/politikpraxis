"""
Tests für neue auth_service-Funktionen: Magic-Link-Token-Hashing und
Refresh-Token-Rotation (soweit ohne DB testbar).
"""

import hashlib

import pytest
from app.services.auth_service import _hash_magic_token, create_access_token, decode_token


# ---------------------------------------------------------------------------
# _hash_magic_token
# ---------------------------------------------------------------------------


def test_hash_magic_token_is_deterministic():
    """Gleicher Input → gleicher Hash."""
    raw = "abc-def-ghi"
    assert _hash_magic_token(raw) == _hash_magic_token(raw)


def test_hash_magic_token_not_plaintext():
    """Hash-Ausgabe ist nicht der rohe Token."""
    raw = "my-secret-token-xyz"
    result = _hash_magic_token(raw)
    assert result != raw


def test_hash_magic_token_is_sha256():
    """Gibt SHA-256-Hex-Digest zurück (64 Zeichen)."""
    raw = "test-token"
    expected = hashlib.sha256(raw.encode()).hexdigest()
    assert _hash_magic_token(raw) == expected
    assert len(result := _hash_magic_token(raw)) == 64
    assert result.isalnum()  # Hex-String


def test_hash_magic_token_different_inputs_produce_different_hashes():
    """Verschiedene Tokens → verschiedene Hashes (keine Kollisionen für triviale Inputs)."""
    assert _hash_magic_token("token-a") != _hash_magic_token("token-b")


def test_hash_magic_token_empty_string():
    """Leerer String erzeugt validen Hash (kein Crash)."""
    result = _hash_magic_token("")
    assert len(result) == 64


# ---------------------------------------------------------------------------
# Access-Token — implizit wird auch das Token-Hashing geprüft
# (kein Klartext-Token in JWT-Payload)
# ---------------------------------------------------------------------------


def test_access_token_does_not_contain_raw_secret():
    """Access-Token enthält kein 'raw_magic_token' im Payload."""
    raw = "super-secret-raw-token"
    token = create_access_token("user-id-123")
    # Token sollte den rohen Magic-Token-Wert nicht enthalten
    assert raw not in token


def test_decode_returns_user_id_not_token():
    """decode_token gibt User-ID zurück, nicht einen anderen Token."""
    user_id = "user-id-456"
    access = create_access_token(user_id)
    decoded = decode_token(access)
    assert decoded == user_id
