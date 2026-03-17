"""Tabellen eu_events, eu_events_i18n, eu_event_choices, eu_event_choices_i18n (SMA-267)

Revision ID: 010_eu_events
Revises: 009_eu_klima
Create Date: 2025-03-17

Migration 4: EU-Events-Schema für reaktive Richtlinien, Random, Fix.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "010_eu_events"
down_revision: Union[str, Sequence[str], None] = "009_eu_klima"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create eu_events and related tables."""
    op.create_table(
        "eu_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("politikfeld_id", sa.Text(), sa.ForeignKey("politikfelder(id)"), nullable=True),
        sa.Column("trigger_klima_min", sa.Integer(), nullable=True),
        sa.Column("trigger_monat", sa.Integer(), nullable=True),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="3"),
    )

    op.create_table(
        "eu_events_i18n",
        sa.Column("event_id", sa.Text(), sa.ForeignKey("eu_events(id)"), primary_key=True),
        sa.Column("locale", sa.String(5), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column("ticker", sa.Text(), nullable=False),
    )

    op.create_table(
        "eu_event_choices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Text(), sa.ForeignKey("eu_events(id)"), nullable=False),
        sa.Column("choice_key", sa.Text(), nullable=False),
        sa.Column("cost_pk", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("effekt_al", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_hh", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_gi", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("eu_klima_delta", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("kofinanzierung", sa.Numeric(4, 2), nullable=True, server_default="0"),
    )

    op.create_table(
        "eu_event_choices_i18n",
        sa.Column("choice_id", sa.Integer(), sa.ForeignKey("eu_event_choices(id)"), primary_key=True),
        sa.Column("locale", sa.String(5), primary_key=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
        sa.Column("log_msg", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    """Drop eu_events tables."""
    op.drop_table("eu_event_choices_i18n")
    op.drop_table("eu_event_choices")
    op.drop_table("eu_events_i18n")
    op.drop_table("eu_events")
