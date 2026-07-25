from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    payload: dict[str, Any] = {}
    game_month: int = Field(ge=0, le=48)
    save_id: UUID | None = None


class AnalyticsBatchRequest(BaseModel):
    events: list[AnalyticsEventRequest]


class AnalyticsSummaryResponse(BaseModel):
    total_games: int
    avg_approval: float
