from pydantic import BaseModel, ConfigDict
from typing import Any


class EffekteSchema(BaseModel):
    """Effekte für Gesetze, Event-Choices und Bundesrat-Tradeoffs."""

    al: float = 0
    hh: float = 0
    gi: float = 0
    zf: float = 0


class CharResponse(BaseModel):
    id: str
    initials: str
    color: str
    mood_start: int
    loyalty_start: int
    ultimatum_mood_thresh: int | None
    ultimatum_event_id: str | None
    bonus_trigger: str | None
    bonus_applies: str | None
    min_complexity: int | None
    name: str
    role: str
    bio: str
    bonus_desc: str | None
    interests: list[str]
    keyword: str | None

    model_config = ConfigDict(from_attributes=True)


class GesetzResponse(BaseModel):
    id: str
    tags: list[str]
    bt_stimmen_ja: int
    effekte: EffekteSchema
    effekt_lag: int
    foederalismus_freundlich: bool
    titel: str
    kurz: str
    desc: str

    model_config = ConfigDict(from_attributes=True)


class EventChoiceResponse(BaseModel):
    key: str
    type: str
    cost_pk: int
    effekte: EffekteSchema
    char_mood: dict[str, int]
    label: str
    desc: str
    log_msg: str

    model_config = ConfigDict(from_attributes=True)


class EventResponse(BaseModel):
    id: str
    event_type: str
    trigger_type: str | None
    min_complexity: int | None
    type_label: str
    title: str
    quote: str
    context: str
    ticker: str
    choices: list[EventChoiceResponse]

    model_config = ConfigDict(from_attributes=True)


class BundesratTradeoffResponse(BaseModel):
    key: str
    effekte: EffekteSchema
    char_mood: dict[str, int]
    label: str
    desc: str

    model_config = ConfigDict(from_attributes=True)


class BundesratResponse(BaseModel):
    id: str
    laender: list[str]
    basis_bereitschaft: int
    beziehung_start: int
    sprecher_initials: str
    sprecher_color: str
    name: str
    sprecher_name: str
    sprecher_partei: str
    sprecher_land: str
    sprecher_bio: str
    tradeoffs: list[BundesratTradeoffResponse]

    model_config = ConfigDict(from_attributes=True)


class ContentBundleResponse(BaseModel):
    characters: list[dict[str, Any]]
    events: list[dict[str, Any]]
    charEvents: dict[str, dict[str, Any]]
    laws: list[dict[str, Any]]
    bundesrat: list[dict[str, Any]]
    scenario: dict[str, Any]
