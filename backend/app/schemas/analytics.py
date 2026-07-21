from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AnalyticsEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    payload: dict[str, Any] = {}
    game_month: int = Field(ge=0, le=48)
    save_id: str | None = None

    @field_validator("save_id")
    @classmethod
    def validate_save_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        try:
            UUID(v)
        except ValueError as exc:
            raise ValueError("Ungültige save_id (muss UUID sein)") from exc
        return v


class AnalyticsBatchRequest(BaseModel):
    events: list[AnalyticsEventRequest]


class AnalyticsSummaryResponse(BaseModel):
    total_games: int
    avg_approval: float
