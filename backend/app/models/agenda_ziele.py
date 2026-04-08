"""SQLAlchemy ORM-Models: Spieler-Agenda- und Koalitionsziele (SMA-500)."""

from typing import Any

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class AgendaZiel(Base):
    __tablename__ = "agenda_ziele"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    kategorie: Mapped[str] = mapped_column(Text(), nullable=False)
    schwierigkeit: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="1"
    )
    partei_filter: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(
        JSONB(), nullable=True
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    bedingung_typ: Mapped[str] = mapped_column(Text(), nullable=False)
    bedingung_param: Mapped[dict[str, Any]] = mapped_column(
        JSONB(), nullable=False, server_default="{}"
    )


class AgendaZielI18n(Base):
    __tablename__ = "agenda_ziele_i18n"

    agenda_ziel_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("agenda_ziele.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text(), nullable=False)


class KoalitionsZiel(Base):
    __tablename__ = "koalitions_ziele"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    partner_profil: Mapped[str] = mapped_column(Text(), nullable=False)
    kategorie: Mapped[str] = mapped_column(Text(), nullable=False)
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    bedingung_typ: Mapped[str] = mapped_column(Text(), nullable=False)
    bedingung_param: Mapped[dict[str, Any]] = mapped_column(
        JSONB(), nullable=False, server_default="{}"
    )
    beziehung_malus: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="0"
    )


class KoalitionsZielI18n(Base):
    __tablename__ = "koalitions_ziele_i18n"

    koalitions_ziel_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("koalitions_ziele.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text(), nullable=False)
