"""i18n-Tabelle für Medienakteur-Namen (DE/EN).

Revision ID: 053_medien_akteure_i18n
Revises: 052_umwelt_wirtschaft_gesetze
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "053_medien_akteure_i18n"
down_revision: Union[str, Sequence[str], None] = "052_umwelt_wirtschaft_gesetze"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medien_akteure_i18n",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "akteur_id",
            sa.Text(),
            sa.ForeignKey("medien_akteure.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "akteur_id", "locale", name="uq_medien_akteure_i18n_akteur_locale"
        ),
    )

    # Seed: DE-Daten (1:1 aus name_de), EN-Daten (Übersetzungen)
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            INSERT INTO medien_akteure_i18n (akteur_id, locale, name) VALUES
              ('oeffentlich', 'de', 'Öffentliche Medien'),
              ('oeffentlich', 'en', 'Public Media'),
              ('boulevard',   'de', 'BZ Today'),
              ('boulevard',   'en', 'BZ Today'),
              ('qualitaet',   'de', 'Das Panorama'),
              ('qualitaet',   'en', 'Das Panorama'),
              ('social',      'de', 'TikFeed'),
              ('social',      'en', 'TikFeed'),
              ('konservativ', 'de', 'Nationale Stimme'),
              ('konservativ', 'en', 'National Voice'),
              ('alternativ',  'de', 'WahrheitNow'),
              ('alternativ',  'en', 'WahrheitNow')
        """)
    )


def downgrade() -> None:
    op.drop_table("medien_akteure_i18n")
