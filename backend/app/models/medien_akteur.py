"""SMA-392: Medienakteure (plurales Medienökosystem) — nur Lesen für Content-API."""

import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class MedienAkteur(Base):
    __tablename__ = "medien_akteure"
    __table_args__ = (
        CheckConstraint(
            "typ IN ('oeffentlich','boulevard','qualitaet','social','konservativ','alternativ')",
            name="ck_medien_akteure_typ",
        ),
    )

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    name_de: Mapped[str] = mapped_column(Text(), nullable=False)
    typ: Mapped[str] = mapped_column(Text(), nullable=False)
    reichweite: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    stimmung_start: Mapped[int | None] = mapped_column(Integer(), server_default="0")
    agenda_staerke: Mapped[float | None] = mapped_column(
        Numeric(3, 2), server_default="0.5"
    )
    min_complexity: Mapped[int | None] = mapped_column(Integer(), server_default="2")


class MedienAkteurI18n(Base):
    __tablename__ = "medien_akteure_i18n"
    __table_args__ = (
        UniqueConstraint(
            "akteur_id", "locale", name="uq_medien_akteure_i18n_akteur_locale"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default="gen_random_uuid()"
    )
    akteur_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("medien_akteure.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(locale_type, nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
