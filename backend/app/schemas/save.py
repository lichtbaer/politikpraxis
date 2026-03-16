from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


class SaveCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    state: dict[str, Any]
    month: int = Field(ge=1, le=48)
    approval: float = Field(ge=0, le=100)
    scenario_id: str = "standard"


class SaveUpdateRequest(BaseModel):
    name: str | None = None
    state: dict[str, Any] | None = None
    month: int | None = None
    approval: float | None = None


class SaveResponse(BaseModel):
    id: str
    name: str
    month: int
    approval: float
    scenario_id: str
    updated_at: datetime


class SaveDetailResponse(SaveResponse):
    state: dict[str, Any]
