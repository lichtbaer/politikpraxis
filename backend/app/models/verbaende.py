"""SQLAlchemy ORM-Models: Verbände und VerbandsTradeoffs."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class Verband(Base):
    __tablename__ = "verbaende"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    politikfeld_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), nullable=False
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
    beziehung_start: Mapped[int] = mapped_column(Integer(), nullable=False)
    staerke_bund: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    staerke_eu: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    staerke_laender: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    staerke_kommunen: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    konflikt_mit: Mapped[list[str]] = mapped_column(
        ARRAY(Text()), nullable=False, server_default="{}"
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="2"
    )


class VerbandI18n(Base):
    __tablename__ = "verbaende_i18n"

    verband_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("verbaende(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)
    bio: Mapped[str] = mapped_column(Text(), nullable=False)


class VerbandsTradeoff(Base):
    __tablename__ = "verbands_tradeoffs"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    verband_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("verbaende(id)"), nullable=False
    )
    tradeoff_key: Mapped[str] = mapped_column(Text(), nullable=False)
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
    feld_druck_delta: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    medienklima_delta: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    verband_effekte: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)


class VerbandsTradeoffI18n(Base):
    __tablename__ = "verbands_tradeoffs_i18n"

    tradeoff_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("verbands_tradeoffs(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
