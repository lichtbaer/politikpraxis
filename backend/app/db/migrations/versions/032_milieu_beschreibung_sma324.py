"""SMA-324: Milieu-Beschreibungen korrigieren — Bürgerliche Mitte vs. Traditionelle

Revision ID: 032_milieu_beschr
Revises: 031_verbands_cost_pk
Create Date: 2026-03-18

Buergerliche Mitte hatte fälschlich die Beschreibung der Traditionellen.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "032_milieu_beschr"
down_revision: Union[str, Sequence[str], None] = "031_verbands_cost_pk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Korrekte Beschreibungen für buergerliche_mitte und traditionelle."""
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE milieus_i18n
            SET beschreibung = 'Wirtschaftlich orientierte Mittelschicht mit bürgerlichen Werten und hoher Wahlbeteiligung.'
            WHERE milieu_id = 'buergerliche_mitte' AND locale = 'de'
        """)
    )
    conn.execute(
        sa.text("""
            UPDATE milieus_i18n
            SET beschreibung = 'Traditionelle Mittelschicht mit moderater Beteiligung und konservativen Grundwerten.'
            WHERE milieu_id = 'traditionelle' AND locale = 'de'
        """)
    )


def downgrade() -> None:
    """Rückgängig: alte (vertauschte) Beschreibungen."""
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE milieus_i18n
            SET beschreibung = 'Traditionelle Mittelschicht mit moderater Beteiligung.'
            WHERE milieu_id = 'buergerliche_mitte' AND locale = 'de'
        """)
    )
    conn.execute(
        sa.text("""
            UPDATE milieus_i18n
            SET beschreibung = 'Traditionell orientierte Wähler mit starker Wertebindung.'
            WHERE milieu_id = 'traditionelle' AND locale = 'de'
        """)
    )
