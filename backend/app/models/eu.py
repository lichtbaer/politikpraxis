"""SQLAlchemy ORM-Models: EU-Klima, EU-Events."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class EuKlimaStartwert(Base):
    __tablename__ = "eu_klima_startwerte"

    politikfeld_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), primary_key=True
    )
    startwert: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="50"
    )
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="3"
    )


class EuEvent(Base):
    __tablename__ = "eu_events"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    event_type: Mapped[str] = mapped_column(Text(), nullable=False)
    politikfeld_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), nullable=True
    )
    trigger_klima_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    trigger_monat: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="3"
    )


class EuEventI18n(Base):
    __tablename__ = "eu_events_i18n"

    event_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("eu_events(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
    context: Mapped[str] = mapped_column(Text(), nullable=False)
    ticker: Mapped[str] = mapped_column(Text(), nullable=False)


class EuEventChoice(Base):
    __tablename__ = "eu_event_choices"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("eu_events(id)"), nullable=False
    )
    choice_key: Mapped[str] = mapped_column(Text(), nullable=False)
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
    eu_klima_delta: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    kofinanzierung: Mapped[Decimal | None] = mapped_column(
        Numeric(4, 2), nullable=True, server_default="0"
    )


class EuEventChoiceI18n(Base):
    __tablename__ = "eu_event_choices_i18n"

    choice_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("eu_event_choices(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    log_msg: Mapped[str] = mapped_column(Text(), nullable=False)
