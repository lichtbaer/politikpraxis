"""SQLAlchemy ORM-Models: Events, EventChoices."""

from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    event_type: Mapped[str] = mapped_column(Text(), nullable=False)
    char_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("chars(id)"), nullable=True
    )
    trigger_type: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_month: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    repeat_interval: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    condition_key: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_op: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_val: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    politikfeld_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("politikfelder.id"), nullable=True
    )
    trigger_druck_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    trigger_milieu_key: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_milieu_op: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_milieu_val: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    gesetz_ref: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    trigger_typ: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_params: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    einmalig: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default=text("true")
    )


class EventI18n(Base):
    __tablename__ = "events_i18n"

    event_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("events(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    type_label: Mapped[str] = mapped_column(Text(), nullable=False)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
    context: Mapped[str] = mapped_column(Text(), nullable=False)
    ticker: Mapped[str] = mapped_column(Text(), nullable=False)


class EventChoice(Base):
    __tablename__ = "event_choices"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("events(id)"), nullable=False
    )
    choice_key: Mapped[str] = mapped_column(Text(), nullable=False)
    choice_type: Mapped[str] = mapped_column(Text(), nullable=False)
    cost_pk: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    effekt_al: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_hh: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_gi: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_zf: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    char_mood: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB(), nullable=True, server_default="{}"
    )
    loyalty: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB(), nullable=True, server_default="{}"
    )
    followup_event_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("events(id)"), nullable=True
    )
    koalitionspartner_beziehung_delta: Mapped[int | None] = mapped_column(
        Integer(), nullable=True
    )
    medienklima_delta: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    verfahren_dauer_monate: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    bundesrat_bonus: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    milieu_delta: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    schuldenbremse_spielraum_delta: Mapped[int | None] = mapped_column(
        Integer(), nullable=True
    )
    steuerpolitik_modifikator_delta: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 4), nullable=True
    )
    konjunktur_index_delta: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    br_relation_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB(), nullable=True
    )
    verband_delta: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    sektor_delta: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    haushalt_saldo_delta_mrd: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )


class EventChoiceI18n(Base):
    __tablename__ = "event_choices_i18n"

    choice_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("event_choices(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    log_msg: Mapped[str] = mapped_column(Text(), nullable=False)
