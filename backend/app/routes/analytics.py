from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.analytics import AnalyticsBatchRequest, AnalyticsSummaryResponse
from app.services.analytics_service import get_summary, record_events
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/batch")
@limiter.limit("30/minute")
async def batch(
    request: Request,
    req: AnalyticsBatchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await record_events(
        db,
        user.id,
        [ev.model_dump() for ev in req.events],
    )
    return {"recorded": count}


@router.get("/summary", response_model=AnalyticsSummaryResponse)
@limiter.limit("10/minute")
async def summary(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_summary(db)
