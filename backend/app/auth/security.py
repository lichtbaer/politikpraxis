"""Passwort- und Token-Hashing (bcrypt work factor 12)."""

import secrets

import bcrypt

BCRYPT_WORK_FACTOR = 12


def hash_secret(value: str) -> str:
    """Beliebigen String (Passwort oder Refresh-Token) mit bcrypt hashen."""
    salt = bcrypt.gensalt(rounds=BCRYPT_WORK_FACTOR)
    return bcrypt.hashpw(value.encode(), salt).decode()


def verify_secret(plain: str, hashed: str) -> bool:
    """bcrypt-Verify für Passwort oder Refresh-Token."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    """Passwort hashen mit bcrypt work factor 12."""
    return hash_secret(password)


def verify_password(password: str, hashed: str) -> bool:
    return verify_secret(password, hashed)


def generate_secure_token() -> str:
    """32 Byte kryptografisch sicherer Token (URL-safe)."""
    return secrets.token_urlsafe(32)
