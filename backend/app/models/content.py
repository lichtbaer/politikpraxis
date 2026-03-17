"""SQLAlchemy ORM-Models für Content-Tabellen (chars, gesetze, events, bundesrat)."""

from decimal import Decimal
from typing import Any

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, Boolean
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Char(Base):
    __tablename__ = "chars"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    initials: Mapped[str] = mapped_column(Text(), nullable=False)
    color: Mapped[str] = mapped_column(Text(), nullable=False)
    mood_start: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="3")
    loyalty_start: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="3")
    ultimatum_mood_thresh: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    ultimatum_event_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_trigger: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_applies: Mapped[str | None] = mapped_column(Text(), nullable=True)
    sonderregel: Mapped[str | None] = mapped_column(Text(), nullable=True)


class CharI18n(Base):
    __tablename__ = "chars_i18n"

    char_id: Mapped[str] = mapped_column(Text(), ForeignKey("chars(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    role: Mapped[str] = mapped_column(Text(), nullable=False)
    bio: Mapped[str] = mapped_column(Text(), nullable=False)
    bonus_desc: Mapped[str | None] = mapped_column(Text(), nullable=True)
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    keyword: Mapped[str | None] = mapped_column(Text(), nullable=True)


class Gesetz(Base):
    __tablename__ = "gesetze"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    bt_stimmen_ja: Mapped[int] = mapped_column(Integer(), nullable=False)
    effekt_al: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_lag: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="4")
    foederalismus_freundlich: Mapped[bool | None] = mapped_column(Boolean(), nullable=True, server_default="false")


class GesetzI18n(Base):
    __tablename__ = "gesetze_i18n"

    gesetz_id: Mapped[str] = mapped_column(Text(), ForeignKey("gesetze(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    event_type: Mapped[str] = mapped_column(Text(), nullable=False)
    char_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("chars(id)"), nullable=True)
    trigger_type: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_month: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    repeat_interval: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    condition_key: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_op: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_val: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")


class EventI18n(Base):
    __tablename__ = "events_i18n"

    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("events(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    type_label: Mapped[str] = mapped_column(Text(), nullable=False)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
    context: Mapped[str] = mapped_column(Text(), nullable=False)
    ticker: Mapped[str] = mapped_column(Text(), nullable=False)


class EventChoice(Base):
    __tablename__ = "event_choices"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("events(id)"), nullable=False)
    choice_key: Mapped[str] = mapped_column(Text(), nullable=False)
    choice_type: Mapped[str] = mapped_column(Text(), nullable=False)
    cost_pk: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    char_mood: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")
    loyalty: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")
    followup_event_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("events(id)"), nullable=True)


class EventChoiceI18n(Base):
    __tablename__ = "event_choices_i18n"

    choice_id: Mapped[int] = mapped_column(Integer(), ForeignKey("event_choices(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    log_msg: Mapped[str] = mapped_column(Text(), nullable=False)


class BundesratFraktion(Base):
    __tablename__ = "bundesrat_fraktionen"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    laender: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False)
    basis_bereitschaft: Mapped[int] = mapped_column(Integer(), nullable=False)
    beziehung_start: Mapped[int] = mapped_column(Integer(), nullable=False)
    sonderregel: Mapped[str | None] = mapped_column(Text(), nullable=True)
    sprecher_initials: Mapped[str] = mapped_column(Text(), nullable=False)
    sprecher_color: Mapped[str] = mapped_column(Text(), nullable=False)


class BundesratFraktionI18n(Base):
    __tablename__ = "bundesrat_fraktionen_i18n"

    fraktion_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("bundesrat_fraktionen(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    sprecher_name: Mapped[str] = mapped_column(Text(), nullable=False)
    sprecher_partei: Mapped[str] = mapped_column(Text(), nullable=False)
    sprecher_land: Mapped[str] = mapped_column(Text(), nullable=False)
    sprecher_bio: Mapped[str] = mapped_column(Text(), nullable=False)


class BundesratTradeoff(Base):
    __tablename__ = "bundesrat_tradeoffs"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    fraktion_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("bundesrat_fraktionen(id)"), nullable=False
    )
    tradeoff_key: Mapped[str] = mapped_column(Text(), nullable=False)
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    char_mood: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")


class BundesratTradeoffI18n(Base):
    __tablename__ = "bundesrat_tradeoffs_i18n"

    tradeoff_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("bundesrat_tradeoffs(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
