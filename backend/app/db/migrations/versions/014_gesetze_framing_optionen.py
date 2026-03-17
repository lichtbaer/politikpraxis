"""Gesetze: framing_optionen (SMA-276)

Revision ID: 014_framing_optionen
Revises: 013_kommunal_vorstufen
Create Date: 2025-03-17

Migration 1: Neues Feld framing_optionen in gesetze (JSONB).
Format: [{ key, milieu_effekte: {milieu_id: delta}, verband_effekte: {verband_id: delta}, medienklima_delta }]
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "014_framing_optionen"
down_revision: Union[str, Sequence[str], None] = "013_kommunal_vorstufen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add framing_optionen column to gesetze."""
    op.add_column(
        "gesetze",
        sa.Column(
            "framing_optionen",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    """Remove framing_optionen column from gesetze."""
    op.drop_column("gesetze", "framing_optionen")
