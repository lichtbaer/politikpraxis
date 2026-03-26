"""SQLAlchemy ORM-Models: Politikfelder, Milieus."""

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class Politikfeld(Base):
    __tablename__ = "politikfelder"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    verband_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    vernachlaessigung_start: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    druck_event_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("events(id)"), nullable=True
    )
    eu_relevanz: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    kommunal_relevanz: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )


class PolitikfeldI18n(Base):
    __tablename__ = "politikfelder_i18n"

    feld_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)


class Milieu(Base):
    __tablename__ = "milieus"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    gewicht: Mapped[int] = mapped_column(Integer(), nullable=False)
    basisbeteiligung: Mapped[int] = mapped_column(Integer(), nullable=False)
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    ideologie_staat: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="1"
    )
    aggregat_gruppe: Mapped[str | None] = mapped_column(Text(), nullable=True)


class MilieuI18n(Base):
    __tablename__ = "milieus_i18n"

    milieu_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("milieus(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurzcharakter: Mapped[str] = mapped_column(Text(), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text(), nullable=False)
