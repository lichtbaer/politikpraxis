"""Unit-Tests für dependencies.py — get_optional_user mit ungültigem JWT-sub."""

import pytest
from app.dependencies import get_optional_user
from app.services.auth_service import create_access_token
from fastapi.security import HTTPAuthorizationCredentials


@pytest.mark.asyncio
async def test_get_optional_user_no_credentials_returns_none():
    result = await get_optional_user(credentials=None, db=None)
    assert result is None


@pytest.mark.asyncio
async def test_get_optional_user_invalid_uuid_sub_returns_none():
    """sub ist kein gültiges UUID-Format (z.B. manipulierter/alter Token) → None statt 500."""
    token = create_access_token("not-a-uuid")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = await get_optional_user(credentials=credentials, db=None)
    assert result is None
