import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

MAX_GAME_STATE_BYTES = 500 * 1024


class SaveUpsertRequest(BaseModel):
    game_state: dict[str, Any]
    name: str | None = Field(None, max_length=200)
    complexity: int | None = Field(None, ge=1, le=4)
    player_name: str | None = Field(None, max_length=100)
    ausrichtung: dict[str, float] | None = None
    kanzler_geschlecht: str | None = Field(None, max_length=10)

    @field_validator("game_state")
    @classmethod
    def check_game_state_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        raw = json.dumps(v, separators=(",", ":"))
        if len(raw.encode("utf-8")) > MAX_GAME_STATE_BYTES:
            raise ValueError("game_state darf maximal 500 KB groß sein")
        return v


class SaveListItem(BaseModel):
    id: str
    slot: int
    name: str | None
    partei: str | None
    monat: int | None
    wahlprognose: float | None
    complexity: int | None
    updated_at: datetime


class SaveDetailResponse(SaveListItem):
    game_state: dict[str, Any]
    client_meta: dict[str, Any] = Field(default_factory=dict)
