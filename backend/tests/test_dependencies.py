"""
Unit-Tests für app.dependencies — reine Funktionen, kein DB erforderlich.
"""

import pytest
from app.dependencies import get_optional_user
from app.services.auth_service import create_access_token
from fastapi.security import HTTPAuthorizationCredentials


@pytest.mark.asyncio
async def test_get_optional_user_no_credentials_returns_none():
    result = await get_optional_user(credentials=None, db=None)
    assert result is None


@pytest.mark.asyncio
async def test_get_optional_user_invalid_token_returns_none():
    creds = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="not.a.valid.token"
    )
    result = await get_optional_user(credentials=creds, db=None)
    assert result is None


@pytest.mark.asyncio
async def test_get_optional_user_non_uuid_sub_returns_none():
    """Gültig signiertes Token, aber `sub` ist keine UUID → anonym (None) statt 500."""
    token = create_access_token("not-a-uuid")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = await get_optional_user(credentials=creds, db=None)
    assert result is None
