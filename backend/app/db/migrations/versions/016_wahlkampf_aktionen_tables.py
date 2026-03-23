"""Wahlkampf-Aktionen Tabellen (SMA-276)

Revision ID: 016_wahlkampf_aktionen
Revises: 015_medien_events
Create Date: 2025-03-17

Migration 3: Tabellen wahlkampf_aktionen, wahlkampf_aktionen_i18n.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "016_wahlkampf_aktionen"
down_revision: Union[str, Sequence[str], None] = "015_medien_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create wahlkampf_aktionen and i18n table."""
    op.create_table(
        "wahlkampf_aktionen",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("aktion_typ", sa.Text(), nullable=False),
        sa.Column("cost_pk", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("einmalig", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("max_pro_monat", sa.Integer(), nullable=True, server_default="1"),
    )

    op.create_table(
        "wahlkampf_aktionen_i18n",
        sa.Column(
            "aktion_id",
            sa.Text(),
            sa.ForeignKey("wahlkampf_aktionen.id"),
            primary_key=True,
        ),
        sa.Column("locale", sa.String(5), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    """Drop wahlkampf_aktionen tables."""
    op.drop_table("wahlkampf_aktionen_i18n")
    op.drop_table("wahlkampf_aktionen")
