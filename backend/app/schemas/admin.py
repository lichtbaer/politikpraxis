"""Pydantic-Schemas für Admin-API (CRUD Request/Response)."""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

# --- Chars ---


class CharCreate(BaseModel):
    id: str = Field(max_length=64)
    initials: str = Field(max_length=8)
    color: str = Field(max_length=32)
    mood_start: int = 3
    loyalty_start: int = 3
    ultimatum_mood_thresh: int | None = None
    ultimatum_event_id: str | None = Field(default=None, max_length=64)
    bonus_trigger: str | None = Field(default=None, max_length=64)
    bonus_applies: str | None = Field(default=None, max_length=64)
    sonderregel: str | None = Field(default=None, max_length=256)
    min_complexity: int | None = 1


class CharUpdate(BaseModel):
    initials: str | None = Field(default=None, max_length=8)
    color: str | None = Field(default=None, max_length=32)
    mood_start: int | None = None
    loyalty_start: int | None = None
    ultimatum_mood_thresh: int | None = None
    ultimatum_event_id: str | None = Field(default=None, max_length=64)
    bonus_trigger: str | None = Field(default=None, max_length=64)
    bonus_applies: str | None = Field(default=None, max_length=64)
    sonderregel: str | None = Field(default=None, max_length=256)
    min_complexity: int | None = None


class CharI18nCreate(BaseModel):
    locale: str = Field(max_length=8)
    name: str = Field(max_length=128)
    role: str = Field(max_length=128)
    bio: str = Field(max_length=2000)
    bonus_desc: str | None = Field(default=None, max_length=512)
    interests: list[str] = Field(default_factory=list)
    keyword: str | None = Field(default=None, max_length=64)


class CharI18nUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    role: str | None = Field(default=None, max_length=128)
    bio: str | None = Field(default=None, max_length=2000)
    bonus_desc: str | None = Field(default=None, max_length=512)
    interests: list[str] | None = None
    keyword: str | None = Field(default=None, max_length=64)


# --- Gesetze ---


class GesetzCreate(BaseModel):
    id: str = Field(max_length=64)
    tags: list[str] = Field(default_factory=list)
    bt_stimmen_ja: int
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    effekt_lag: int = 4
    foederalismus_freundlich: bool | None = None
    locked_until_event: str | None = Field(default=None, max_length=64)
    zustimmungspflichtig: bool | None = None
    langzeit_score: int = 0
    langzeitwirkung_positiv_de: list[str] = Field(default_factory=list)
    langzeitwirkung_negativ_de: list[str] = Field(default_factory=list)


class GesetzUpdate(BaseModel):
    tags: list[str] | None = None
    bt_stimmen_ja: int | None = None
    effekt_al: Decimal | float | None = None
    effekt_hh: Decimal | float | None = None
    effekt_gi: Decimal | float | None = None
    effekt_zf: Decimal | float | None = None
    effekt_lag: int | None = None
    foederalismus_freundlich: bool | None = None
    locked_until_event: str | None = Field(default=None, max_length=64)
    zustimmungspflichtig: bool | None = None
    langzeit_score: int | None = None
    langzeitwirkung_positiv_de: list[str] | None = None
    langzeitwirkung_negativ_de: list[str] | None = None


class GesetzI18nUpdate(BaseModel):
    titel: str | None = Field(default=None, max_length=256)
    kurz: str | None = Field(default=None, max_length=256)
    desc: str | None = Field(default=None, max_length=2000)


# --- Events ---


class EventCreate(BaseModel):
    id: str = Field(max_length=64)
    event_type: str = Field(max_length=64)
    char_id: str | None = Field(default=None, max_length=64)
    trigger_type: str | None = Field(default=None, max_length=64)
    trigger_month: int | None = None
    repeat_interval: int | None = None
    condition_key: str | None = Field(default=None, max_length=64)
    condition_op: str | None = Field(default=None, max_length=16)
    condition_val: int | None = None
    min_complexity: int | None = 1
    trigger_typ: str | None = Field(default=None, max_length=64)
    trigger_params: dict[str, Any] | None = None
    einmalig: bool | None = True


class EventUpdate(BaseModel):
    event_type: str | None = Field(default=None, max_length=64)
    char_id: str | None = Field(default=None, max_length=64)
    trigger_type: str | None = Field(default=None, max_length=64)
    trigger_month: int | None = None
    repeat_interval: int | None = None
    condition_key: str | None = Field(default=None, max_length=64)
    condition_op: str | None = Field(default=None, max_length=16)
    condition_val: int | None = None
    min_complexity: int | None = None
    trigger_typ: str | None = Field(default=None, max_length=64)
    trigger_params: dict[str, Any] | None = None
    einmalig: bool | None = None


class EventI18nUpdate(BaseModel):
    type_label: str | None = Field(default=None, max_length=128)
    title: str | None = Field(default=None, max_length=256)
    quote: str | None = Field(default=None, max_length=512)
    context: str | None = Field(default=None, max_length=2000)
    ticker: str | None = Field(default=None, max_length=256)


class EventChoiceCreate(BaseModel):
    choice_key: str = Field(max_length=64)
    choice_type: str = Field(max_length=64)
    cost_pk: int = 0
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    char_mood: dict[str, Any] = Field(default_factory=dict)
    loyalty: dict[str, Any] = Field(default_factory=dict)
    followup_event_id: str | None = Field(default=None, max_length=64)


class EventChoiceI18nUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=256)
    desc: str | None = Field(default=None, max_length=2000)
    log_msg: str | None = Field(default=None, max_length=512)


# --- Bundesrat ---


class BundesratFraktionCreate(BaseModel):
    id: str = Field(max_length=64)
    laender: list[str] = Field(default_factory=list)
    basis_bereitschaft: int
    beziehung_start: int
    sonderregel: str | None = Field(default=None, max_length=256)
    partei_id: str | None = Field(default=None, max_length=64)
    sprecher_initials: str = Field(max_length=8)
    sprecher_color: str = Field(max_length=32)


class BundesratFraktionI18nUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    sprecher_name: str | None = Field(default=None, max_length=128)
    sprecher_partei: str | None = Field(default=None, max_length=128)
    sprecher_land: str | None = Field(default=None, max_length=128)
    sprecher_bio: str | None = Field(default=None, max_length=2000)


class BundesratTradeoffCreate(BaseModel):
    tradeoff_key: str = Field(max_length=64)
    effekt_al: Decimal | float = 0
    effekt_hh: Decimal | float = 0
    effekt_gi: Decimal | float = 0
    effekt_zf: Decimal | float = 0
    char_mood: dict[str, Any] = Field(default_factory=dict)


class BundesratTradeoffI18nUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=256)
    desc: str | None = Field(default=None, max_length=2000)
