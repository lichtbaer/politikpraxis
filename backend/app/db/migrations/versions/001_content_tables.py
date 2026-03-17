"""Content DB — Schema (Chars, Gesetze, Events, Bundesrat)

Revision ID: 001_content
Revises:
Create Date: 2025-03-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_content"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create content tables and ENUMs."""
    # ENUMs
    content_locale = postgresql.ENUM("de", "en", name="content_locale", create_type=True)
    content_locale.create(op.get_bind(), checkfirst=True)

    content_type = postgresql.ENUM(
        "char",
        "gesetz",
        "event",
        "bundesrat_fraktion",
        "bundesrat_event",
        "milieu",
        name="content_type",
        create_type=True,
    )
    content_type.create(op.get_bind(), checkfirst=True)

    # chars
    op.create_table(
        "chars",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("initials", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("mood_start", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("loyalty_start", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("ultimatum_mood_thresh", sa.Integer(), nullable=True),
        sa.Column("ultimatum_event_id", sa.Text(), nullable=True),
        sa.Column("bonus_trigger", sa.Text(), nullable=True),
        sa.Column("bonus_applies", sa.Text(), nullable=True),
        sa.Column("sonderregel", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "chars_i18n",
        sa.Column("char_id", sa.Text(), sa.ForeignKey("chars.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("bonus_desc", sa.Text(), nullable=True),
        sa.Column("interests", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("keyword", sa.Text(), nullable=True),
    )
    op.create_index("ix_chars_i18n_char_id_locale", "chars_i18n", ["char_id", "locale"], unique=True)

    # gesetze
    op.create_table(
        "gesetze",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("bt_stimmen_ja", sa.Integer(), nullable=False),
        sa.Column("effekt_al", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_hh", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_gi", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_lag", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("foederalismus_freundlich", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "gesetze_i18n",
        sa.Column("gesetz_id", sa.Text(), sa.ForeignKey("gesetze.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("titel", sa.Text(), nullable=False),
        sa.Column("kurz", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
    )
    op.create_index("ix_gesetze_i18n_gesetz_id_locale", "gesetze_i18n", ["gesetz_id", "locale"], unique=True)

    # events
    op.create_table(
        "events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("char_id", sa.Text(), sa.ForeignKey("chars.id"), nullable=True),
        sa.Column("trigger_type", sa.Text(), nullable=True),
        sa.Column("trigger_month", sa.Integer(), nullable=True),
        sa.Column("repeat_interval", sa.Integer(), nullable=True),
        sa.Column("condition_key", sa.Text(), nullable=True),
        sa.Column("condition_op", sa.Text(), nullable=True),
        sa.Column("condition_val", sa.Integer(), nullable=True),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "events_i18n",
        sa.Column("event_id", sa.Text(), sa.ForeignKey("events.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("type_label", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column("ticker", sa.Text(), nullable=False),
    )
    op.create_index("ix_events_i18n_event_id_locale", "events_i18n", ["event_id", "locale"], unique=True)

    # event_choices
    op.create_table(
        "event_choices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Text(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("choice_key", sa.Text(), nullable=False),
        sa.Column("choice_type", sa.Text(), nullable=False),
        sa.Column("cost_pk", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("effekt_al", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_hh", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_gi", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("char_mood", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("loyalty", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("followup_event_id", sa.Text(), sa.ForeignKey("events.id"), nullable=True),
    )

    op.create_table(
        "event_choices_i18n",
        sa.Column("choice_id", sa.Integer(), sa.ForeignKey("event_choices.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
        sa.Column("log_msg", sa.Text(), nullable=False),
    )
    op.create_index("ix_event_choices_i18n_choice_id_locale", "event_choices_i18n", ["choice_id", "locale"], unique=True)

    # bundesrat_fraktionen
    op.create_table(
        "bundesrat_fraktionen",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("laender", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("basis_bereitschaft", sa.Integer(), nullable=False),
        sa.Column("beziehung_start", sa.Integer(), nullable=False),
        sa.Column("sonderregel", sa.Text(), nullable=True),
        sa.Column("sprecher_initials", sa.Text(), nullable=False),
        sa.Column("sprecher_color", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "bundesrat_fraktionen_i18n",
        sa.Column("fraktion_id", sa.Text(), sa.ForeignKey("bundesrat_fraktionen.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sprecher_name", sa.Text(), nullable=False),
        sa.Column("sprecher_partei", sa.Text(), nullable=False),
        sa.Column("sprecher_land", sa.Text(), nullable=False),
        sa.Column("sprecher_bio", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_bundesrat_fraktionen_i18n_fraktion_id_locale",
        "bundesrat_fraktionen_i18n",
        ["fraktion_id", "locale"],
        unique=True,
    )

    # bundesrat_tradeoffs
    op.create_table(
        "bundesrat_tradeoffs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fraktion_id", sa.Text(), sa.ForeignKey("bundesrat_fraktionen.id"), nullable=False),
        sa.Column("tradeoff_key", sa.Text(), nullable=False),
        sa.Column("effekt_al", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_hh", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_gi", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("char_mood", postgresql.JSONB(), nullable=True, server_default="{}"),
    )

    op.create_table(
        "bundesrat_tradeoffs_i18n",
        sa.Column("tradeoff_id", sa.Integer(), sa.ForeignKey("bundesrat_tradeoffs.id"), primary_key=True),
        sa.Column("locale", postgresql.ENUM("de", "en", name="content_locale", create_type=False), primary_key=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_bundesrat_tradeoffs_i18n_tradeoff_id_locale",
        "bundesrat_tradeoffs_i18n",
        ["tradeoff_id", "locale"],
        unique=True,
    )


def downgrade() -> None:
    """Drop content tables and ENUMs."""
    op.drop_table("bundesrat_tradeoffs_i18n")
    op.drop_table("bundesrat_tradeoffs")
    op.drop_table("bundesrat_fraktionen_i18n")
    op.drop_table("bundesrat_fraktionen")
    op.drop_table("event_choices_i18n")
    op.drop_table("event_choices")
    op.drop_table("events_i18n")
    op.drop_table("events")
    op.drop_table("gesetze_i18n")
    op.drop_table("gesetze")
    op.drop_table("chars_i18n")
    op.drop_table("chars")

    postgresql.ENUM(name="content_locale").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="content_type").drop(op.get_bind(), checkfirst=True)
