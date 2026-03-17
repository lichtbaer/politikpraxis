"""SQLAlchemy ORM-Models für Content-Tabellen (chars, gesetze, events, bundesrat)."""

from decimal import Decimal
from typing import Any

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, Boolean
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

_locale_type = PgEnum("de", "en", name="content_locale", create_type=False)

from app.db.database import Base


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
    spielbar: Mapped[bool] = mapped_column(Boolean(), nullable=False, server_default="true")


class ParteiI18n(Base):
    __tablename__ = "parteien_i18n"

    partei_id: Mapped[str] = mapped_column(Text(), ForeignKey("parteien.id"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    kernthemen: Mapped[str] = mapped_column(Text(), nullable=False)


class Char(Base):
    __tablename__ = "chars"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    partei_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("parteien.id"), nullable=True)
    initials: Mapped[str] = mapped_column(Text(), nullable=False)
    color: Mapped[str] = mapped_column(Text(), nullable=False)
    mood_start: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="3")
    loyalty_start: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="3")
    ultimatum_mood_thresh: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    ultimatum_event_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_trigger: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_applies: Mapped[str | None] = mapped_column(Text(), nullable=True)
    sonderregel: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_staat: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")


class CharI18n(Base):
    __tablename__ = "chars_i18n"

    char_id: Mapped[str] = mapped_column(Text(), ForeignKey("chars(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    role: Mapped[str] = mapped_column(Text(), nullable=False)
    bio: Mapped[str] = mapped_column(Text(), nullable=False)
    eingangszitat: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bonus_desc: Mapped[str | None] = mapped_column(Text(), nullable=True)
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    keyword: Mapped[str | None] = mapped_column(Text(), nullable=True)


class Gesetz(Base):
    __tablename__ = "gesetze"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    bt_stimmen_ja: Mapped[int] = mapped_column(Integer(), nullable=False)
    effekt_al: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_lag: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="4")
    foederalismus_freundlich: Mapped[bool | None] = mapped_column(Boolean(), nullable=True, server_default="false")
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_staat: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    politikfeld_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("politikfelder.id"), nullable=True)
    politikfeld_sekundaer: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    # Haushalt: Kostenstruktur (SMA-267)
    kosten_einmalig: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=True, server_default="0")
    kosten_laufend: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=True, server_default="0")
    einnahmeeffekt: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=True, server_default="0")
    investiv: Mapped[bool] = mapped_column(Boolean(), nullable=True, server_default="false")
    # Vorstufen-Erlaubnis (SMA-272)
    kommunal_pilot_moeglich: Mapped[bool] = mapped_column(Boolean(), nullable=True, server_default="true")
    laender_pilot_moeglich: Mapped[bool] = mapped_column(Boolean(), nullable=True, server_default="true")
    eu_initiative_moeglich: Mapped[bool] = mapped_column(Boolean(), nullable=True, server_default="true")
    # Framing-Optionen (SMA-276): [{key, milieu_effekte, verband_effekte, medienklima_delta}]
    framing_optionen: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(), nullable=False, server_default="[]"
    )


class GesetzI18n(Base):
    __tablename__ = "gesetze_i18n"

    gesetz_id: Mapped[str] = mapped_column(Text(), ForeignKey("gesetze(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    event_type: Mapped[str] = mapped_column(Text(), nullable=False)
    char_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("chars(id)"), nullable=True)
    trigger_type: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_month: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    repeat_interval: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    condition_key: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_op: Mapped[str | None] = mapped_column(Text(), nullable=True)
    condition_val: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    # Kommunal-Initiative Trigger (SMA-275)
    politikfeld_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("politikfelder.id"), nullable=True
    )
    trigger_druck_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    trigger_milieu_key: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_milieu_op: Mapped[str | None] = mapped_column(Text(), nullable=True)
    trigger_milieu_val: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    gesetz_ref: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)


class EventI18n(Base):
    __tablename__ = "events_i18n"

    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("events(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    type_label: Mapped[str] = mapped_column(Text(), nullable=False)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
    context: Mapped[str] = mapped_column(Text(), nullable=False)
    ticker: Mapped[str] = mapped_column(Text(), nullable=False)


class EventChoice(Base):
    __tablename__ = "event_choices"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("events(id)"), nullable=False)
    choice_key: Mapped[str] = mapped_column(Text(), nullable=False)
    choice_type: Mapped[str] = mapped_column(Text(), nullable=False)
    cost_pk: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    char_mood: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")
    loyalty: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")
    followup_event_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("events(id)"), nullable=True)
    # SMA-280: Extremismus-Events
    koalitionspartner_beziehung_delta: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    medienklima_delta: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    verfahren_dauer_monate: Mapped[int | None] = mapped_column(Integer(), nullable=True)


class EventChoiceI18n(Base):
    __tablename__ = "event_choices_i18n"

    choice_id: Mapped[int] = mapped_column(Integer(), ForeignKey("event_choices(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    log_msg: Mapped[str] = mapped_column(Text(), nullable=False)


class BundesratFraktion(Base):
    __tablename__ = "bundesrat_fraktionen"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    partei_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("parteien.id"), nullable=True)
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
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
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
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    char_mood: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True, server_default="{}")


class BundesratTradeoffI18n(Base):
    __tablename__ = "bundesrat_tradeoffs_i18n"

    tradeoff_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("bundesrat_tradeoffs(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)


# --- Politikfelder, Milieus, Verbände, Ministerial-Initiativen ---


class Politikfeld(Base):
    __tablename__ = "politikfelder"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    verband_id: Mapped[str | None] = mapped_column(Text(), nullable=True)
    vernachlaessigung_start: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    druck_event_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("events(id)"), nullable=True)
    eu_relevanz: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    kommunal_relevanz: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")


class PolitikfeldI18n(Base):
    __tablename__ = "politikfelder_i18n"

    feld_id: Mapped[str] = mapped_column(Text(), ForeignKey("politikfelder(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)


class Milieu(Base):
    __tablename__ = "milieus"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    gewicht: Mapped[int] = mapped_column(Integer(), nullable=False)
    basisbeteiligung: Mapped[int] = mapped_column(Integer(), nullable=False)
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_staat: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    aggregat_gruppe: Mapped[str | None] = mapped_column(Text(), nullable=True)


class MilieuI18n(Base):
    __tablename__ = "milieus_i18n"

    milieu_id: Mapped[str] = mapped_column(Text(), ForeignKey("milieus(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurzcharakter: Mapped[str] = mapped_column(Text(), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text(), nullable=False)


class Verband(Base):
    __tablename__ = "verbaende"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    politikfeld_id: Mapped[str] = mapped_column(Text(), ForeignKey("politikfelder(id)"), nullable=False)
    ideologie_wirtschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_gesellschaft: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    ideologie_staat: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    beziehung_start: Mapped[int] = mapped_column(Integer(), nullable=False)
    staerke_bund: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    staerke_eu: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    staerke_laender: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    staerke_kommunen: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="1")
    konflikt_mit: Mapped[list[str]] = mapped_column(ARRAY(Text()), nullable=False, server_default="{}")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="2")


class VerbandI18n(Base):
    __tablename__ = "verbaende_i18n"

    verband_id: Mapped[str] = mapped_column(Text(), ForeignKey("verbaende(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    kurz: Mapped[str] = mapped_column(Text(), nullable=False)
    bio: Mapped[str] = mapped_column(Text(), nullable=False)


class VerbandsTradeoff(Base):
    __tablename__ = "verbands_tradeoffs"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    verband_id: Mapped[str] = mapped_column(Text(), ForeignKey("verbaende(id)"), nullable=False)
    tradeoff_key: Mapped[str] = mapped_column(Text(), nullable=False)
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    feld_druck_delta: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")


class VerbandsTradeoffI18n(Base):
    __tablename__ = "verbands_tradeoffs_i18n"

    tradeoff_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("verbands_tradeoffs(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)


class MinisterialInitiative(Base):
    __tablename__ = "ministerial_initiativen"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    char_id: Mapped[str] = mapped_column(Text(), ForeignKey("chars(id)"), nullable=False)
    gesetz_ref_id: Mapped[str | None] = mapped_column(Text(), ForeignKey("gesetze(id)"), nullable=True)
    trigger_type: Mapped[str] = mapped_column(Text(), nullable=False)
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="3")
    cooldown_months: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="8")


class MinisterialInitiativeI18n(Base):
    __tablename__ = "ministerial_initiativen_i18n"

    initiative_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("ministerial_initiativen(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    titel: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)


# --- EU-Klima, EU-Events (SMA-267) ---


class EuKlimaStartwert(Base):
    __tablename__ = "eu_klima_startwerte"

    politikfeld_id: Mapped[str] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), primary_key=True
    )
    startwert: Mapped[int] = mapped_column(Integer(), nullable=False, server_default="50")
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="3")


class EuEvent(Base):
    __tablename__ = "eu_events"

    id: Mapped[str] = mapped_column(Text(), primary_key=True)
    event_type: Mapped[str] = mapped_column(Text(), nullable=False)
    politikfeld_id: Mapped[str | None] = mapped_column(
        Text(), ForeignKey("politikfelder(id)"), nullable=True
    )
    trigger_klima_min: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    trigger_monat: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    min_complexity: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="3")


class EuEventI18n(Base):
    __tablename__ = "eu_events_i18n"

    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("eu_events(id)"), primary_key=True)
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    quote: Mapped[str] = mapped_column(Text(), nullable=False)
    context: Mapped[str] = mapped_column(Text(), nullable=False)
    ticker: Mapped[str] = mapped_column(Text(), nullable=False)


class EuEventChoice(Base):
    __tablename__ = "eu_event_choices"

    id: Mapped[int] = mapped_column(Integer(), primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(Text(), ForeignKey("eu_events(id)"), nullable=False)
    choice_key: Mapped[str] = mapped_column(Text(), nullable=False)
    cost_pk: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    effekt_al: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_hh: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_gi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    effekt_zf: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, server_default="0")
    eu_klima_delta: Mapped[int | None] = mapped_column(Integer(), nullable=True, server_default="0")
    kofinanzierung: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True, server_default="0")


class EuEventChoiceI18n(Base):
    __tablename__ = "eu_event_choices_i18n"

    choice_id: Mapped[int] = mapped_column(
        Integer(), ForeignKey("eu_event_choices(id)"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(_locale_type, primary_key=True)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    desc: Mapped[str] = mapped_column(Text(), nullable=False)
    log_msg: Mapped[str] = mapped_column(Text(), nullable=False)
