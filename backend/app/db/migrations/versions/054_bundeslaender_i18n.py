"""i18n-Tabelle für Bundesländer-Namen (DE/EN).

Revision ID: 054_bundeslaender_i18n
Revises: 053_medien_akteure_i18n
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "054_bundeslaender_i18n"
down_revision: Union[str, Sequence[str], None] = "053_medien_akteure_i18n"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (id, name_de, name_en)
LAENDER: list[tuple[str, str, str]] = [
    ("BY", "Bayern", "Bavaria"),
    ("NW", "Nordrhein-Westfalen", "North Rhine-Westphalia"),
    ("BW", "Baden-Württemberg", "Baden-Württemberg"),
    ("NI", "Niedersachsen", "Lower Saxony"),
    ("HE", "Hessen", "Hesse"),
    ("HH", "Hamburg", "Hamburg"),
    ("HB", "Bremen", "Bremen"),
    ("BE", "Berlin", "Berlin"),
    ("SH", "Schleswig-Holstein", "Schleswig-Holstein"),
    ("SL", "Saarland", "Saarland"),
    ("RP", "Rheinland-Pfalz", "Rhineland-Palatinate"),
    ("BB", "Brandenburg", "Brandenburg"),
    ("SN", "Sachsen", "Saxony"),
    ("TH", "Thüringen", "Thuringia"),
    ("MV", "Mecklenburg-Vorpommern", "Mecklenburg-Vorpommern"),
    ("ST", "Sachsen-Anhalt", "Saxony-Anhalt"),
]


def upgrade() -> None:
    op.create_table(
        "bundeslaender_i18n",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "land_id",
            sa.Text(),
            sa.ForeignKey("bundeslaender.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "land_id", "locale", name="uq_bundeslaender_i18n_land_locale"
        ),
    )

    conn = op.get_bind()
    for land_id, name_de, name_en in LAENDER:
        conn.execute(
            sa.text("""
                INSERT INTO bundeslaender_i18n (land_id, locale, name) VALUES
                  (:id, 'de', :name_de),
                  (:id, 'en', :name_en)
            """),
            {"id": land_id, "name_de": name_de, "name_en": name_en},
        )


def downgrade() -> None:
    op.drop_table("bundeslaender_i18n")
