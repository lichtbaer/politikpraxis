"""SMA-403: Skalare Ideologie pro Gesetz (BT-Malus / Partner-Widerstand).

Revision ID: 047_sma403_ideologie_wert
Revises: 046_sma395_bundeslaender
Create Date: 2026-03-27
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "047_sma403_ideologie_wert"
down_revision: Union[str, Sequence[str], None] = "046_sma395_bundeslaender"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "gesetze",
        sa.Column(
            "ideologie_wert",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    # Skalar aus den drei Achsen (-100 … +100), konsistent mit Frontend-Heuristik
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE gesetze SET ideologie_wert = GREATEST(-100, LEAST(100,
                ROUND((COALESCE(ideologie_wirtschaft,0) + COALESCE(ideologie_gesellschaft,0)
                     + COALESCE(ideologie_staat,0)) / 3.0)::integer
            ))
        """)
    )


def downgrade() -> None:
    op.drop_column("gesetze", "ideologie_wert")
