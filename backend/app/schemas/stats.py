from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GameStatCreateRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=128)
    partei: str = Field(..., min_length=2, max_length=16)
    complexity: int = Field(..., ge=1, le=4)
    gewonnen: bool
    wahlprognose: float = Field(..., ge=0, le=100)
    monate_gespielt: int = Field(..., ge=1, le=48)
    gesetze_beschlossen: int | None = Field(None, ge=0)
    gesetze_gescheitert: int | None = Field(None, ge=0)
    koalitionsbruch: bool = False
    saldo_final: float | None = None
    gini_final: float | None = Field(None, ge=0, le=100)
    arbeitslosigkeit_final: float | None = Field(None, ge=0, le=100)
    medienklima_final: int | None = Field(None, ge=0, le=100)
    skandale_gesamt: int | None = Field(None, ge=0)
    pk_verbraucht: int | None = Field(None, ge=0)
    top_politikfeld: str | None = Field(None, max_length=64)
    bewertung_gesamt: str | None = Field(None, max_length=1)
    titel: str | None = Field(None, max_length=128)
    opt_in_community: bool = False


class GameStatCreateResponse(BaseModel):
    id: str
    recorded: bool = True


class NachParteiRow(BaseModel):
    partei: str
    anzahl: int
    gewinnrate: float
    wahlprognose_avg: float


class PolitikfeldCount(BaseModel):
    feld: str
    anzahl: int


class TitelCount(BaseModel):
    titel: str
    anzahl: int


class CommunityStatsResponse(BaseModel):
    gesamt: int
    gewinnrate: float
    wahlprognose_avg: float
    nach_partei: list[NachParteiRow]
    top_politikfelder: list[PolitikfeldCount]
    titel_verteilung: list[TitelCount]


class MeStatItem(BaseModel):
    id: str
    partei: str
    complexity: int
    gewonnen: bool
    wahlprognose: float
    monate_gespielt: int
    bewertung_gesamt: str | None
    titel: str | None
    created_at: datetime


class HighscoreItem(BaseModel):
    titel: str | None
    partei: str
    wahlprognose: float
    gesetze_beschlossen: int | None
    saldo_final: float | None
    complexity: int
    created_at: datetime


class HighscoresResponse(BaseModel):
    items: list[HighscoreItem]
