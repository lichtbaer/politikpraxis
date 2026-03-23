from typing import Any

from pydantic import BaseModel, Field


class AnalyticsEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    payload: dict[str, Any] = {}
    game_month: int = Field(ge=0, le=48)
    save_id: str | None = None


class AnalyticsBatchRequest(BaseModel):
    events: list[AnalyticsEventRequest]


class AnalyticsSummaryResponse(BaseModel):
    total_games: int
    avg_approval: float
    win_rate: float
    popular_laws: list[dict[str, Any]]
    avg_game_duration_months: float
