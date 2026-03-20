from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    MagicLinkEmailRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequestBody,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    consume_magic_link_token,
    consume_password_reset_token,
    create_access_token,
    create_magic_link_token,
    create_password_reset_token,
    create_refresh_session,
    delete_user_account,
    get_current_user,
    get_or_create_user_for_magic_link,
    get_user_with_password_by_email,
    purge_expired_refresh_tokens,
    register_user,
    revoke_all_refresh_tokens,
    revoke_refresh_cookie,
    validate_refresh_cookie,
)
from app.services.email_service import send_magic_link_email, send_password_reset_email

router = APIRouter()
settings = get_settings()


def attach_refresh_cookie(response: Response, raw_token: str) -> None:
    max_age = settings.refresh_token_expire_days * 86400
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        max_age=max_age,
        httponly=True,
        secure=not settings.debug,
        samesite="strict",
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/",
        samesite="strict",
        httponly=True,
        secure=not settings.debug,
    )


@router.post("/magic-link", response_model=MessageResponse)
@limiter.limit("3 per 10 minutes")
async def request_magic_link(
    request: Request,
    req: MagicLinkEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Sendet Magic Link — immer 200 (keine User-Enumeration)."""
    user = await get_or_create_user_for_magic_link(db, req.email.lower().strip())
    raw = await create_magic_link_token(db, user)
    verify_url = f"{settings.public_api_base_url.rstrip('/')}/auth/magic-link/verify?token={raw}"
    await send_magic_link_email(req.email, verify_url)
    return MessageResponse(detail="ok")


@router.get("/magic-link/verify")
async def verify_magic_link(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Einmal-Link; setzt Refresh-Cookie und leitet ins Frontend."""
    user = await consume_magic_link_token(db, token)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    await revoke_all_refresh_tokens(db, user.id)
    raw = await create_refresh_session(db, user)

    cb = f"{settings.frontend_base_url.rstrip('/')}/auth/callback"
    url = f"{cb}?{urlencode({'magic': 'success'})}"
    response = RedirectResponse(url=url, status_code=302)
    attach_refresh_cookie(response, raw)
    return response


@router.post("/password-reset/request", response_model=MessageResponse)
@limiter.limit("3 per hour")
async def password_reset_request(
    request: Request,
    req: PasswordResetRequestBody,
    db: AsyncSession = Depends(get_db),
):
    """Immer 200 — keine User-Enumeration. Mail nur wenn Konto mit Passwort existiert."""
    user = await get_user_with_password_by_email(db, req.email)
    if user:
        raw = await create_password_reset_token(db, user)
        reset_url = f"{settings.frontend_base_url.rstrip('/')}/passwort-reset?token={raw}"
        await send_password_reset_email(req.email, reset_url)
    return MessageResponse(detail="ok")


@router.post("/password-reset/confirm", response_model=AccessTokenResponse)
@limiter.limit("10/minute")
async def password_reset_confirm(
    request: Request,
    req: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await consume_password_reset_token(db, req.token.strip(), req.new_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiger oder abgelaufener Link",
        )
    access = create_access_token(str(user.id))
    raw = await create_refresh_session(db, user)
    response = JSONResponse(content=AccessTokenResponse(access_token=access).model_dump())
    attach_refresh_cookie(response, raw)
    return response


@router.post("/register", response_model=AccessTokenResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await register_user(db, req.email.lower().strip(), req.password)
    access = create_access_token(str(user.id))
    raw = await create_refresh_session(db, user)
    response = JSONResponse(content=AccessTokenResponse(access_token=access).model_dump())
    attach_refresh_cookie(response, raw)
    return response


@router.post("/login", response_model=AccessTokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, req.email.lower().strip(), req.password)
    access = create_access_token(str(user.id))
    await revoke_all_refresh_tokens(db, user.id)
    raw = await create_refresh_session(db, user)
    response = JSONResponse(content=AccessTokenResponse(access_token=access).model_dump())
    attach_refresh_cookie(response, raw)
    return response


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    refresh_cookie: str | None = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    await purge_expired_refresh_tokens(db)
    user = await validate_refresh_cookie(db, refresh_cookie)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access = create_access_token(str(user.id))
    return AccessTokenResponse(access_token=access)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    refresh_cookie: str | None = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    await revoke_refresh_cookie(db, refresh_cookie)
    clear_refresh_cookie(response)
    return MessageResponse(detail="ok")


@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await revoke_all_refresh_tokens(db, user.id)
    await delete_user_account(db, user)
    clear_refresh_cookie(response)
    return MessageResponse(detail="ok")


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(id=str(user.id), email=user.email)
