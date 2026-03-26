"""SQLAlchemy ORM-Models: Parteien, Chars."""

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models._shared import locale_type


class Partei(Base):
    __tablename__ = "parteien"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    kuerzel: Mapped[str] = mapped_column(Text(), nullable=False)
    farbe: Mapped[str] = mapped_column(Text(), nullable=False)
    ideologie_wirtschaft: Mapped[int] = mapped_column(Integer(), nullable=False)
    ideologie_gesellschaft: Mapped[int] = mapped_column(Integer(), nullable=False)
    ideologie_staat: Mapped[int] = mapped_column(Integer(), nullable=False)
    korridor_w_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    korridor_w_max: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    korridor_g_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    korridor_g_max: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    korridor_s_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    korridor_s_max: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    spielbar: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true"
    )


class ParteiI18n(Base):
    __tablename__ = "parteien_i18n"

    partei_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("parteien.id"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    kernthemen: Mapped[str] = mapped_column(Text(), nullable=False)


class Char(Base):
    __tablename__ = "chars"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    partei_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("parteien.id"), nullable=True
    )
    initials: Mapped[str] = mapped_column(Text(), nullable=False)
    color: Mapped[str] = mapped_column(Text(), nullable=False)
    mood_start: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="3"
    )
    loyalty_start: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="3"
    )
    ultimatum_mood_thresh: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    ultimatum_event_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_trigger: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_applies: Mapped[str | None] = mapped_column(Text(), nullable=True)
    sonderregel: Mapped[str | None] = mapped_column(Text(), nullable=True)
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
    pool_partei: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ressort: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ressort_partner: Mapped[str | None] = mapped_column(Text(), nullable=True)
    agenda: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    ist_kanzler: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="false"
    )
    ist_partner_minister: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="false"
    )
    agenda_stufe_aktuell: Mapped[int | None] = mapped_column(
        Integer(), nullable=True, server_default="0"
    )
    agenda_ablehnungen: Mapped[int] = mapped_column(
        Integer(), nullable=False, server_default="0"
    )


class CharI18n(Base):
    __tablename__ = "chars_i18n"

    char_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("chars(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    role: Mapped[str] = mapped_column(Text(), nullable=False)
    bio: Mapped[str] = mapped_column(Text(), nullable=False)
    eingangszitat: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_desc: Mapped[str | None] = mapped_column(Text(), nullable=True)
    interests: Mapped[list[str]] = mapped_column(
        ARRAY(Text()), nullable=False, server_default="{}"
    )
    keyword: Mapped[str | None] = mapped_column(Text(), nullable=True)
