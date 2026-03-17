"""Medien-Events Tabellen (SMA-276)

Revision ID: 015_medien_events
Revises: 014_framing_optionen
Create Date: 2025-03-17

Migration 2: Tabellen medien_events, medien_events_i18n, medien_event_choices, medien_event_choices_i18n.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "015_medien_events"
down_revision: Union[str, Sequence[str], None] = "014_framing_optionen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create medien_events and related tables."""
    op.create_table(
        "medien_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("event_subtype", sa.Text(), nullable=False),  # 'skandal' | 'positiv' | 'opposition'
        sa.Column("trigger_type", sa.Text(), nullable=False),   # 'random' | 'conditional'
        sa.Column("medienklima_delta", sa.Integer(), nullable=False),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="2"),
        sa.Column("trigger_monat_min", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("cooldown_months", sa.Integer(), nullable=True, server_default="4"),
    )

    op.create_table(
        "medien_events_i18n",
        sa.Column("event_id", sa.Text(), sa.ForeignKey("medien_events.id"), primary_key=True),
        sa.Column("locale", sa.String(5), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
    )

    op.create_table(
        "medien_event_choices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Text(), sa.ForeignKey("medien_events.id"), nullable=False),
        sa.Column("choice_key", sa.Text(), nullable=False),
        sa.Column("cost_pk", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("medienklima_delta", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("char_mood_delta", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("verband_id", sa.Text(), sa.ForeignKey("verbaende.id"), nullable=True),
        sa.Column("verband_delta", sa.Integer(), nullable=True, server_default="0"),
    )

    op.create_table(
        "medien_event_choices_i18n",
        sa.Column("choice_id", sa.Integer(), sa.ForeignKey("medien_event_choices.id"), primary_key=True),
        sa.Column("locale", sa.String(5), primary_key=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
        sa.Column("log_msg", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    """Drop medien_events tables."""
    op.drop_table("medien_event_choices_i18n")
    op.drop_table("medien_event_choices")
    op.drop_table("medien_events_i18n")
    op.drop_table("medien_events")
