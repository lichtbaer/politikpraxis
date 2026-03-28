"""SQLAlchemy ORM-Models: Gesetze."""

from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class Gesetz(Base):
    __tablename__ = "gesetze"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text()), nullable=False, server_default="{}"
    )
    bt_stimmen_ja: Mapped[int] = mapped_column(Integer(), nullable=False)
    effekt_al: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_hh: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_gi: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_zf: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=True, server_default="0"
    )
    effekt_lag: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="4"
    )
    foederalismus_freundlich: Mapped[bool | None] = mapped_column(
        Boolean(), nullable=True, server_default="false"
    )
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    ideologie_staat: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    ideologie_wert: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    politikfeld_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("politikfelder.id"), nullable=True
    )
    politikfeld_sekundaer: Mapped[list[str]] = mapped_column(
        ARRAY(Text()), nullable=False, server_default="{}"
    )
    kosten_einmalig: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=True, server_default="0"
    )
    kosten_laufend: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=True, server_default="0"
    )
    einnahmeeffekt: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=True, server_default="0"
    )
    pflichtausgaben_delta: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=True, server_default="0"
    )
    investiv: Mapped[bool] = mapped_column(
        Boolean(), nullable=True, server_default="false"
    )
    kommunal_pilot_moeglich: Mapped[bool] = mapped_column(
        Boolean(), nullable=True, server_default="true"
    )
    laender_pilot_moeglich: Mapped[bool] = mapped_column(
        Boolean(), nullable=True, server_default="true"
    )
    eu_initiative_moeglich: Mapped[bool] = mapped_column(
        Boolean(), nullable=True, server_default="true"
    )
    framing_optionen: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(), nullable=False, server_default="[]"
    )
    lobby_mood_effekte: Mapped[dict[str, Any]] = mapped_column(
        JSONB(), nullable=False, server_default="{}"
    )
    lobby_pk_kosten: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="12"
    )
    lobby_gain_range: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB(), nullable=True, server_default='{"min": 2, "max": 6}'
    )
    route_overrides: Mapped[dict[str, Any]] = mapped_column(
        JSONB(), nullable=False, server_default="{}"
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    steuer_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    steuer_delta: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    konjunktur_effekt: Mapped[Decimal | None] = mapped_column(
        Numeric(4, 2), nullable=True, server_default="0"
    )
    konjunktur_lag: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    sektor_effekte: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(), nullable=False, server_default="[]"
    )
    locked_until_event: Mapped[str | None] = mapped_column(Text(), nullable=True)
    zustimmungspflichtig: Mapped[bool | None] = mapped_column(Boolean(), nullable=True)


class GesetzI18n(Base):
    __tablename__ = "gesetze_i18n"

    gesetz_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("gesetze(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
