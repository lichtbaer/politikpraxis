"""SMA-329: Kabinett-System Erweiterungen — ist_partner_minister, agenda_stufe, minister_agenden_log

Revision ID: 034_sma329
Revises: 033_chars_kabinett
Create Date: 2026-03-18

Migration: chars um ist_partner_minister, agenda_stufe_aktuell, agenda_ablehnungen.
Neue Tabelle minister_agenden_log für Agenda-Verlauf.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "034_sma329"
down_revision: Union[str, Sequence[str], None] = "033_chars_kabinett"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chars", sa.Column("ist_partner_minister", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("chars", sa.Column("agenda_stufe_aktuell", sa.Integer(), nullable=True, server_default="0"))
    op.add_column("chars", sa.Column("agenda_ablehnungen", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "minister_agenden_log",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("game_id", sa.Text(), nullable=True),
        sa.Column("char_id", sa.Text(), nullable=True),
        sa.Column("stufe", sa.Integer(), nullable=True),
        sa.Column("monat", sa.Integer(), nullable=True),
        sa.Column("choice_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("minister_agenden_log")
    op.drop_column("chars", "agenda_ablehnungen")
    op.drop_column("chars", "agenda_stufe_aktuell")
    op.drop_column("chars", "ist_partner_minister")
