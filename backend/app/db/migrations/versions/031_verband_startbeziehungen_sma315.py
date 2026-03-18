"""SMA-315: Verbands-Startbeziehungen anpassen — weniger Konflikte in Monat 1

Revision ID: 031_verband_startbeziehungen
Revises: 030_merge_029_heads
Create Date: 2026-03-18

Anhebung der Startbeziehungen für SGD, BVL, BDI damit keine Verbände
im Konfliktbereich (< 30) starten.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "031_verband_startbeziehungen"
down_revision: Union[str, Sequence[str], None] = "030_merge_029_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """SGD 30→40, BVL 35→45, BDI 45→40 (Mindest-Startwert 40)."""
    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 40 WHERE id = 'sgd'")
    )
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 45 WHERE id = 'bvl'")
    )
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 40 WHERE id = 'bdi'")
    )


def downgrade() -> None:
    """Rücknahme auf ursprüngliche Werte aus 005_seed."""
    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 30 WHERE id = 'sgd'")
    )
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 35 WHERE id = 'bvl'")
    )
    conn.execute(
        sa.text("UPDATE verbaende SET beziehung_start = 45 WHERE id = 'bdi'")
    )
