"""SQLAlchemy ORM-Models: Ministerial-Initiativen."""

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class MinisterialInitiative(Base):
    __tablename__ = "ministerial_initiativen"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    char_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("chars(id)"), nullable=False
    )
    gesetz_ref_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("gesetze(id)"), nullable=True
    )
    trigger_type: Mapped[str] = mapped_column(Text(), nullable=False)
    min_complexity: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="3"
    )
    cooldown_months: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="8"
    )


class MinisterialInitiativeI18n(Base):
    __tablename__ = "ministerial_initiativen_i18n"

    initiative_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("ministerial_initiativen(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
