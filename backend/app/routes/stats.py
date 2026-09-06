from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import get_optional_user
from app.limiter import limiter
from app.models.user import User
from app.schemas.stats import (
    CommunityStatsResponse,
    GameStatCreateRequest,
    GameStatCreateResponse,
    HighscoresResponse,
    MeStatItem,
)
from app.services.auth_service import get_current_user
from app.services.stats_service import (
    create_game_stat,
    get_community_stats,
    get_highscores,
    get_user_stats_history,
)

router = APIRouter()


@router.post("", response_model=GameStatCreateResponse)
# Ohne Login schreibbar (session_id reicht) → ohne Limit könnte jeder die
# Community-Statistik und die Highscores unbegrenzt fluten. Ein Spiel dauert
# Stunden; 10/h pro IP lässt Haushalte mit mehreren Spielern noch durch.
@limiter.limit("10/hour")
async def post_stats(
    request: Request,
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
