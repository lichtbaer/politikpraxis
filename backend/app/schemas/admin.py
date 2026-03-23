"""Pydantic-Schemas für Admin-API (CRUD Request/Response)."""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

# --- Chars ---


class CharCreate(BaseModel):
    id: str
    initials: str
    color: str
    mood_start: int = 3
    loyalty_start: int = 3
    ultimatum_mood_thresh: int | None = None
    ultimatum_event_id: str | None = None
    bonus_trigger: str | None = None
    bonus_applies: str | None = None
    sonderregel: str | None = None
    min_complexity: int | None = 1


class CharUpdate(BaseModel):
    initials: str | None = None
    color: str | None = None
    mood_start: int | None = None
    loyalty_start: int | None = None
    ultimatum_mood_thresh: int | None = None
    ultimatum_event_id: str | None = None
    bonus_trigger: str | None = None
    bonus_applies: str | None = None
    sonderregel: str | None = None
    min_complexity: int | None = None


class CharI18nCreate(BaseModel):
    locale: str
    name: str
    role: str
    bio: str
    bonus_desc: str | None = None
    interests: list[str] = Field(default_factory=list)
    keyword: str | None = None


class CharI18nUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    bio: str | None = None
    bonus_desc: str | None = None
    interests: list[str] | None = None
    keyword: str | None = None


# --- Gesetze ---


class GesetzCreate(BaseModel):
    id: str
    tags: list[str] = Field(default_factory=list)
    bt_stimmen_ja: int
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    effekt_lag: int = 4
    foederalismus_freundlich: bool | None = None


class GesetzUpdate(BaseModel):
    tags: list[str] | None = None
    bt_stimmen_ja: int | None = None
    effekt_al: Decimal | float | None = None
    effekt_hh: Decimal | float | None = None
    effekt_gi: Decimal | float | None = None
    effekt_zf: Decimal | float | None = None
    effekt_lag: int | None = None
    foederalismus_freundlich: bool | None = None


class GesetzI18nUpdate(BaseModel):
    titel: str | None = None
    kurz: str | None = None
    desc: str | None = None


# --- Events ---


class EventCreate(BaseModel):
    id: str
    event_type: str
    char_id: str | None = None
    trigger_type: str | None = None
    trigger_month: int | None = None
    repeat_interval: int | None = None
    condition_key: str | None = None
    condition_op: str | None = None
    condition_val: int | None = None
    min_complexity: int | None = 1


class EventUpdate(BaseModel):
    event_type: str | None = None
    char_id: str | None = None
    trigger_type: str | None = None
    trigger_month: int | None = None
    repeat_interval: int | None = None
    condition_key: str | None = None
    condition_op: str | None = None
    condition_val: int | None = None
    min_complexity: int | None = None


class EventI18nUpdate(BaseModel):
    type_label: str | None = None
    title: str | None = None
    quote: str | None = None
    context: str | None = None
    ticker: str | None = None


class EventChoiceCreate(BaseModel):
    choice_key: str
    choice_type: str
    cost_pk: int = 0
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    char_mood: dict[str, Any] = Field(default_factory=dict)
    loyalty: dict[str, Any] = Field(default_factory=dict)
    followup_event_id: str | None = None


class EventChoiceI18nUpdate(BaseModel):
    label: str | None = None
    desc: str | None = None
    log_msg: str | None = None


# --- Bundesrat ---


class BundesratFraktionCreate(BaseModel):
    id: str
    laender: list[str] = Field(default_factory=list)
    basis_bereitschaft: int
    beziehung_start: int
    sonderregel: str | None = None
    partei_id: str | None = None
    sprecher_initials: str
    sprecher_color: str


class BundesratFraktionI18nUpdate(BaseModel):
    name: str | None = None
    sprecher_name: str | None = None
    sprecher_partei: str | None = None
    sprecher_land: str | None = None
    sprecher_bio: str | None = None


class BundesratTradeoffCreate(BaseModel):
    tradeoff_key: str
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    char_mood: dict[str, Any] = Field(default_factory=dict)


class BundesratTradeoffI18nUpdate(BaseModel):
    label: str | None = None
    desc: str | None = None
