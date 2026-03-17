"""Gesetze: Kostenstruktur-Felder + Seed (SMA-267)

Revision ID: 008_gesetze_kosten
Revises: 007_merge
Create Date: 2025-03-17

Migration 1 + 2: Kostenstruktur-Spalten für gesetze und Seed-Daten.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "008_gesetze_kosten"
down_revision: Union[str, Sequence[str], None] = "007_merge"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add kostenstruktur columns and seed data."""
    # --- Migration 1: Spalten hinzufügen ---
    op.add_column(
        "gesetze",
        sa.Column("kosten_einmalig", sa.Numeric(8, 2), server_default="0"),
    )
    op.add_column(
        "gesetze",
        sa.Column("kosten_laufend", sa.Numeric(8, 2), server_default="0"),
    )
    op.add_column(
        "gesetze",
        sa.Column("einnahmeeffekt", sa.Numeric(8, 2), server_default="0"),
    )
    op.add_column(
        "gesetze",
        sa.Column("investiv", sa.Boolean(), server_default="false"),
    )

    # --- Migration 2: Seed für bestehende Gesetze ---
    conn = op.get_bind()
    # id, einmalig, laufend, einnahmeeffekt, investiv
    GESETZ_KOSTEN = [
        ("ee", 8.0, 2.0, 0.0, True),   # EE-Beschleunigung
        ("wb", 5.0, 4.0, 0.0, False),  # Wohnungsbau
        ("sr", 0.0, 0.0, -12.0, False),  # Steuerreform
        ("bp", 3.0, 2.0, 0.0, True),   # Bildungspaket
        ("mindestlohn", 0.0, 3.0, 4.0, False),
        ("pflegereform", 5.0, 4.0, 0.0, False),
        ("kh_reform", 4.0, 3.5, 0.0, False),
        ("digi_bildung", 3.0, 2.5, 0.0, True),
        ("buerokratieabbau", 1.0, -2.0, 0.0, True),
        ("ki_foerder", 6.0, 1.0, 3.0, True),
        ("sicherheit_paket", 1.0, 2.0, 0.0, False),
        ("laenderkompetenz", 0.5, -0.5, 0.0, True),
        ("klimaschutz", 10.0, 1.5, 0.0, True),
        ("lieferkette", 0.0, 0.5, 0.0, False),
        ("grundrechte", 0.0, 0.5, 0.0, False),
    ]

    for gid, einmalig, laufend, einnahme, investiv in GESETZ_KOSTEN:
        conn.execute(
            sa.text("""
                UPDATE gesetze SET kosten_einmalig = :einmalig, kosten_laufend = :laufend,
                    einnahmeeffekt = :einnahme, investiv = :investiv
                WHERE id = :id
            """),
            {
                "id": gid,
                "einmalig": einmalig,
                "laufend": laufend,
                "einnahme": einnahme,
                "investiv": investiv,
            },
        )


def downgrade() -> None:
    """Remove kostenstruktur columns."""
    op.drop_column("gesetze", "investiv")
    op.drop_column("gesetze", "einnahmeeffekt")
    op.drop_column("gesetze", "kosten_laufend")
    op.drop_column("gesetze", "kosten_einmalig")
