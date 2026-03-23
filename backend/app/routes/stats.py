from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.stats import (
    CommunityStatsResponse,
    GameStatCreateRequest,
    GameStatCreateResponse,
    HighscoresResponse,
    MeStatItem,
)
from app.services.auth_service import decode_token, get_current_user
from app.services.stats_service import (
    create_game_stat,
    get_community_stats,
    get_highscores,
    get_user_stats_history,
)

router = APIRouter()
optional_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


@router.post("", response_model=GameStatCreateResponse)
async def post_stats(
    req: GameStatCreateRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not user and not req.session_id.strip():
        raise HTTPException(
            status_code=400, detail="session_id erforderlich ohne Login"
        )
    row = await create_game_stat(db, req, user.id if user else None)
    return GameStatCreateResponse(id=str(row.id))


@router.get("/community", response_model=CommunityStatsResponse)
async def community_stats(db: AsyncSession = Depends(get_db)):
    return await get_community_stats(db)


@router.get("/me", response_model=list[MeStatItem])
async def my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_stats_history(db, user.id)


@router.get("/highscores", response_model=HighscoresResponse)
async def highscores(
    partei: str | None = Query(None, description="Partei-Kürzel (sdp, cdp, …)"),
    complexity: int | None = Query(None, ge=1, le=4),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_highscores(db, partei, complexity, limit)
