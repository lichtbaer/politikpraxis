from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsBatchRequest, AnalyticsSummaryResponse
from app.services.auth_service import get_current_user
from app.services.analytics_service import record_events, get_summary

router = APIRouter()


@router.post("/batch")
async def batch(
    req: AnalyticsBatchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await record_events(
        db, user.id,
        [ev.model_dump() for ev in req.events],
    )
    return {"recorded": count}


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def summary(db: AsyncSession = Depends(get_db)):
    return await get_summary(db)
