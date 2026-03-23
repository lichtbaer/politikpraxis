from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import (
    generate_secure_token,
    hash_password,
    hash_secret,
    verify_password,
    verify_secret,
)
from app.config import get_settings
from app.db.database import get_db
from app.models.magic_link import MagicLink
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User

settings = get_settings()
security = HTTPBearer()

MAGIC_LINK_EXPIRE_MINUTES = 15
PASSWORD_RESET_EXPIRE_MINUTES = 30


def create_access_token(user_id: str) -> str:
    now = int(time.time())
    exp = now + settings.access_token_expire_minutes * 60
    return jwt.encode(
        {"sub": user_id, "exp": exp, "iat": now},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def validate_password_strength(password: str) -> None:
    """Mindestlänge 8 — weitere Regeln absichtlich nicht."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwort muss mindestens 8 Zeichen haben",
        )


async def purge_expired_password_reset_tokens(db: AsyncSession) -> None:
    await db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.expires_at < datetime.now(UTC)
        )
    )


async def get_user_with_password_by_email(db: AsyncSession, email: str) -> User | None:
    """Nur Konten mit gesetztem Passwort (kein reiner Magic-Link-Account)."""
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        return None
    return user


async def create_password_reset_token(db: AsyncSession, user: User) -> str:
    await purge_expired_password_reset_tokens(db)
    raw = generate_secure_token()
    expires = datetime.now(UTC) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    row = PasswordResetToken(user_id=user.id, token=raw, expires_at=expires, used=False)
    db.add(row)
    await db.flush()
    return raw


async def consume_password_reset_token(
    db: AsyncSession, token: str, new_password: str
) -> User | None:
    """Setzt neues Passwort, markiert Token als used, löscht übrige Reset-Tokens des Users."""
    validate_password_strength(new_password)
    await purge_expired_password_reset_tokens(db)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    row = result.scalar_one_or_none()
    if not row or row.used or row.expires_at < datetime.now(UTC):
        return None
    uresult = await db.execute(select(User).where(User.id == row.user_id))
    user = uresult.scalar_one_or_none()
    if not user or not user.is_active or not user.password_hash:
        return None
    user.password_hash = hash_password(new_password)
    user.last_login = datetime.now(UTC)
    row.used = True
    await db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.id != row.id,
        )
    )
    await revoke_all_refresh_tokens(db, user.id)
    await db.flush()
    return user


async def register_user(db: AsyncSession, email: str, password: str) -> User:
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.last_login = datetime.now(UTC)
    await db.flush()
    return user


def _refresh_cookie_value(rt_id: UUID, secret: str) -> str:
    return f"{rt_id}.{secret}"


def _parse_refresh_cookie(raw: str | None) -> tuple[UUID, str] | None:
    if not raw or "." not in raw:
        return None
    left, _, right = raw.partition(".")
    try:
        return UUID(left), right
    except ValueError:
        return None


async def create_refresh_session(db: AsyncSession, user: User) -> str:
    """Legt Refresh-Token in DB an, gibt Cookie-Rohwert zurück."""
    secret = generate_secure_token()
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_secret(secret),
        expires_at=expires,
    )
    db.add(rt)
    await db.flush()
    return _refresh_cookie_value(rt.id, secret)


async def validate_refresh_cookie(
    db: AsyncSession, raw_cookie: str | None
) -> User | None:
    parsed = _parse_refresh_cookie(raw_cookie)
    if not parsed:
        return None
    rt_id, secret = parsed
    result = await db.execute(select(RefreshToken).where(RefreshToken.id == rt_id))
    rt = result.scalar_one_or_none()
    if not rt or rt.expires_at < datetime.now(UTC):
        return None
    if not verify_secret(secret, rt.token_hash):
        return None
    uresult = await db.execute(select(User).where(User.id == rt.user_id))
    user = uresult.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


async def revoke_refresh_cookie(db: AsyncSession, raw_cookie: str | None) -> None:
    parsed = _parse_refresh_cookie(raw_cookie)
    if not parsed:
        return
    rt_id, secret = parsed
    result = await db.execute(select(RefreshToken).where(RefreshToken.id == rt_id))
    rt = result.scalar_one_or_none()
    if rt and verify_secret(secret, rt.token_hash):
        await db.delete(rt)


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: UUID) -> None:
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))


async def delete_user_account(db: AsyncSession, user: User) -> None:
    await db.delete(user)


async def purge_expired_magic_links(db: AsyncSession) -> None:
    await db.execute(delete(MagicLink).where(MagicLink.expires_at < datetime.now(UTC)))


async def purge_expired_refresh_tokens(db: AsyncSession) -> None:
    await db.execute(
        delete(RefreshToken).where(RefreshToken.expires_at < datetime.now(UTC))
    )


async def get_or_create_user_for_magic_link(db: AsyncSession, email: str) -> User:
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(email=email, password_hash=None)
    db.add(user)
    await db.flush()
    return user


async def create_magic_link_token(db: AsyncSession, user: User) -> str:
    await purge_expired_magic_links(db)
    raw = generate_secure_token()
    expires = datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
    row = MagicLink(user_id=user.id, token=raw, expires_at=expires, used=False)
    db.add(row)
    await db.flush()
    return raw


async def consume_magic_link_token(db: AsyncSession, token: str) -> User | None:
    await purge_expired_magic_links(db)
    result = await db.execute(select(MagicLink).where(MagicLink.token == token))
    row = result.scalar_one_or_none()
    if not row or row.used or row.expires_at < datetime.now(UTC):
        return None
    uresult = await db.execute(select(User).where(User.id == row.user_id))
    user = uresult.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    row.used = True
    user.last_login = datetime.now(UTC)
    await db.flush()
    return user
