"""Tabelle eu_klima_startwerte + Seed (SMA-267)

Revision ID: 009_eu_klima
Revises: 008_gesetze_kosten
Create Date: 2025-03-17

Migration 3: EU-Klima-Startwerte pro Politikfeld.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "009_eu_klima"
down_revision: Union[str, Sequence[str], None] = "008_gesetze_kosten"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create eu_klima_startwerte table and seed."""
    op.create_table(
        "eu_klima_startwerte",
        sa.Column("politikfeld_id", sa.Text(), sa.ForeignKey("politikfelder(id)"), primary_key=True),
        sa.Column("startwert", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="3"),
    )

    conn = op.get_bind()
    EU_KLIMA = [
        ("wirtschaft_finanzen", 55, 3),
        ("arbeit_soziales", 45, 3),
        ("umwelt_energie", 70, 3),
        ("innere_sicherheit", 40, 3),
        ("bildung_forschung", 35, 3),
        ("gesundheit_pflege", 30, 3),
        ("digital_infrastruktur", 65, 3),
        ("landwirtschaft", 75, 3),
    ]
    for pfid, startwert, min_complexity in EU_KLIMA:
        conn.execute(
            sa.text("""
                INSERT INTO eu_klima_startwerte (politikfeld_id, startwert, min_complexity)
                VALUES (:pfid, :startwert, :min_complexity)
            """),
            {"pfid": pfid, "startwert": startwert, "min_complexity": min_complexity},
        )


def downgrade() -> None:
    """Drop eu_klima_startwerte."""
    op.drop_table("eu_klima_startwerte")
