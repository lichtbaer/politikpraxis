"""SMA-325: Bundesrat-Startwerte anheben — CDP-Fraktionen min. 25

Revision ID: 032_bundesrat_sma325
Revises: 031_verbands_cost_pk
Create Date: 2026-03-18

Edmund Huber (konservativer_block): Beziehung 15→30, Bereitschaft 20→35
Matthias Kohl (ostblock): Beziehung 25→35, Bereitschaft 30→40
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "032_bundesrat_sma325"
down_revision: Union[str, Sequence[str], None] = (
    "031_verbands_cost_pk",
    "031_verband_startbeziehungen",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """CDP-Fraktionen: höhere Startwerte (kein Konflikt-Niveau vor Spielbeginn)."""
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen
            SET beziehung_start = 30, basis_bereitschaft = 35
            WHERE id = 'konservativer_block'
        """)
    )
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen
            SET beziehung_start = 35, basis_bereitschaft = 40
            WHERE id = 'ostblock'
        """)
    )


def downgrade() -> None:
    """Rücknahme auf ursprüngliche Werte aus 002_data_seed_content."""
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen
            SET beziehung_start = 15, basis_bereitschaft = 20
            WHERE id = 'konservativer_block'
        """)
    )
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen
            SET beziehung_start = 25, basis_bereitschaft = 30
            WHERE id = 'ostblock'
        """)
    )
