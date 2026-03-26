"""SMA-392: Medienakteure (plurales Medienökosystem) — nur Lesen für Content-API."""

from sqlalchemy import CheckConstraint, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


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
    agenda_staerke: Mapped[float | None] = mapped_column(Numeric(3, 2), server_default="0.5")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), server_default="2")
