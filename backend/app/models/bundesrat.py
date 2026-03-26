"""SQLAlchemy ORM-Models: Bundesrat-Fraktionen und Tradeoffs."""

from decimal import Decimal
from typing import Any

from sqlalchemy import ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class BundesratFraktion(Base):
    __tablename__ = "bundesrat_fraktionen"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    partei_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("parteien.id"), nullable=True
    )
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
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
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


class BundesratTradeoffI18n(Base):
    __tablename__ = "bundesrat_tradeoffs_i18n"

    tradeoff_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("bundesrat_tradeoffs(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
