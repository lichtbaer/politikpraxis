"""SMA-390: Medienakteure — Tabelle + Seed (plurales Medienökosystem).

Revision ID: 043_medien_akteure_sma390
Revises: 042_merge_041_040_heads
Create Date: 2026-03-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "043_medien_akteure_sma390"
down_revision: Union[str, Sequence[str], None] = "042_merge_041_040_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medien_akteure",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name_de", sa.Text(), nullable=False),
        sa.Column("typ", sa.Text(), nullable=False),
        sa.Column("reichweite", sa.Numeric(4, 1), nullable=False),
        sa.Column("stimmung_start", sa.Integer(), server_default="0"),
        sa.Column("agenda_staerke", sa.Numeric(3, 2), server_default="0.5"),
        sa.Column("min_complexity", sa.Integer(), server_default="2"),
        sa.CheckConstraint(
            "typ IN ('oeffentlich','boulevard','qualitaet','social','konservativ','alternativ')",
            name="ck_medien_akteure_typ",
        ),
    )
    op.execute(
        """
        INSERT INTO medien_akteure (id, name_de, typ, reichweite, stimmung_start, agenda_staerke, min_complexity) VALUES
          ('oeffentlich', 'Öffentliche Medien', 'oeffentlich', 35.0, 5, 0.3, 2),
          ('boulevard', 'BZ Today', 'boulevard', 25.0, -5, 0.8, 2),
          ('qualitaet', 'Das Panorama', 'qualitaet', 15.0, 0, 0.6, 2),
          ('social', 'TikFeed', 'social', 20.0, 0, 0.9, 2),
          ('konservativ', 'Nationale Stimme', 'konservativ', 10.0, -10, 0.9, 3),
          ('alternativ', 'WahrheitNow', 'alternativ', 5.0, -20, 1.0, 4)
        """
    )


def downgrade() -> None:
    op.drop_table("medien_akteure")
