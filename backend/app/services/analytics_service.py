from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent


async def record_events(
    db: AsyncSession,
    user_id: UUID,
    events: list[dict],
) -> int:
    for ev in events:
        db.add(
            AnalyticsEvent(
                user_id=user_id,
                save_id=UUID(ev["save_id"]) if ev.get("save_id") else None,
                event_type=ev["event_type"],
                payload=ev.get("payload", {}),
                game_month=ev.get("game_month", 0),
            )
        )
    await db.flush()
    return len(events)


async def get_summary(db: AsyncSession) -> dict:
    total_result = await db.execute(
        select(func.count()).select_from(
            select(AnalyticsEvent.save_id)
            .where(AnalyticsEvent.event_type == "game_end")
            .distinct()
            .subquery()
        )
    )
    total_games = total_result.scalar() or 0

    avg_result = await db.execute(
        select(func.avg(AnalyticsEvent.payload["approval"].as_float())).where(
            AnalyticsEvent.event_type == "game_end"
        )
    )
    avg_approval = avg_result.scalar() or 0

    return {
        "total_games": total_games,
        "avg_approval": round(float(avg_approval), 1),
        "win_rate": 0,
        "popular_laws": [],
        "avg_game_duration_months": 0,
    }
