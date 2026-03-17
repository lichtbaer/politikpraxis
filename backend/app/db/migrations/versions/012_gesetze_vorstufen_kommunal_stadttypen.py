"""Gesetze: Vorstufen-Felder, Seed, kommunal_stadttypen (SMA-272)

Revision ID: 012_vorstufen_stadttypen
Revises: 011_haushalt_eu
Create Date: 2025-03-17

Migration 1: Neue Felder in gesetze (kommunal_pilot_moeglich, laender_pilot_moeglich, eu_initiative_moeglich)
Migration 2: Seed Vorstufen-Erlaubnis für bestehende Gesetze
Migration 3: Tabelle kommunal_stadttypen + i18n, Seed 3 Stadttypen (DE + EN)
"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "012_vorstufen_stadttypen"
down_revision: Union[str, Sequence[str], None] = "011_haushalt_eu"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Vorstufen-Felder, seed Vorstufen-Erlaubnis, create kommunal_stadttypen."""
    # --- Migration 1: Neue Felder in gesetze ---
    op.add_column(
        "gesetze",
        sa.Column("kommunal_pilot_moeglich", sa.Boolean(), server_default="true"),
    )
    op.add_column(
        "gesetze",
        sa.Column("laender_pilot_moeglich", sa.Boolean(), server_default="true"),
    )
    op.add_column(
        "gesetze",
        sa.Column("eu_initiative_moeglich", sa.Boolean(), server_default="true"),
    )

    # --- Migration 2: Seed Vorstufen-Erlaubnis für bestehende Gesetze ---
    conn = op.get_bind()
    # EU-Initiative nicht möglich für Sicherheitsgesetze:
    conn.execute(
        sa.text(
            "UPDATE gesetze SET eu_initiative_moeglich = FALSE "
            "WHERE id IN ('sicherheit_paket', 'laenderkompetenz')"
        )
    )
    # Kommunal-Pilot nicht sinnvoll für reine Bundesgesetze:
    conn.execute(
        sa.text(
            "UPDATE gesetze SET kommunal_pilot_moeglich = FALSE "
            "WHERE id IN ('schuldenbremse_reform', 'vermoegensteuer', 'steuerreform_2')"
        )
    )

    # --- Migration 3: Tabelle kommunal_stadttypen ---
    op.create_table(
        "kommunal_stadttypen",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("milieu_bonus", postgresql.JSONB(), nullable=False),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="2"),
    )

    op.create_table(
        "kommunal_stadttypen_i18n",
        sa.Column(
            "stadttyp_id",
            sa.Text(),
            sa.ForeignKey("kommunal_stadttypen(id)"),
            primary_key=True,
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("beispiele", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_kommunal_stadttypen_i18n_stadttyp_id_locale",
        "kommunal_stadttypen_i18n",
        ["stadttyp_id", "locale"],
        unique=True,
    )

    # --- Seed 3 Stadttypen ---
    STADTTYPEN = [
        ("progressiv", {"postmaterielle": 8, "leistungstraeger": 4}, 2),
        ("konservativ", {"traditionelle": 5, "buergerliche_mitte": 3}, 2),
        ("industrie", {"soziale_mitte": 6, "prekaere": 4}, 2),
    ]

    for stadttyp_id, milieu_bonus, min_complexity in STADTTYPEN:
        conn.execute(
            sa.text("""
                INSERT INTO kommunal_stadttypen (id, milieu_bonus, min_complexity)
                VALUES (:id, CAST(:milieu_bonus AS jsonb), :min_complexity)
            """),
            {
                "id": stadttyp_id,
                "milieu_bonus": json.dumps(milieu_bonus),
                "min_complexity": min_complexity,
            },
        )

    # --- Seed kommunal_stadttypen_i18n (DE) ---
    stadttypen_i18n_de = [
        ("progressiv", "Progressive Großstadt", "Hamburg, Berlin, München"),
        ("konservativ", "Konservative Kleinstadt", "Bayreuth, Eichstätt, Passau"),
        ("industrie", "Industriestadt", "Wolfsburg, Ludwigshafen, Leverkusen"),
    ]

    for stadttyp_id, name, beispiele in stadttypen_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO kommunal_stadttypen_i18n (stadttyp_id, locale, name, beispiele)
                VALUES (:stid, 'de', :name, :beispiele)
            """),
            {"stid": stadttyp_id, "name": name, "beispiele": beispiele},
        )

    # --- Seed kommunal_stadttypen_i18n (EN) ---
    stadttypen_i18n_en = [
        ("progressiv", "Progressive Metropolis", "Hamburg, Berlin, Munich"),
        ("konservativ", "Conservative Small Town", "Bayreuth, Eichstätt, Passau"),
        ("industrie", "Industrial City", "Wolfsburg, Ludwigshafen, Leverkusen"),
    ]

    for stadttyp_id, name, beispiele in stadttypen_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO kommunal_stadttypen_i18n (stadttyp_id, locale, name, beispiele)
                VALUES (:stid, 'en', :name, :beispiele)
            """),
            {"stid": stadttyp_id, "name": name, "beispiele": beispiele},
        )


def downgrade() -> None:
    """Remove Vorstufen-Felder und kommunal_stadttypen."""
    op.drop_table("kommunal_stadttypen_i18n")
    op.drop_table("kommunal_stadttypen")

    op.drop_column("gesetze", "eu_initiative_moeglich")
    op.drop_column("gesetze", "laender_pilot_moeglich")
    op.drop_column("gesetze", "kommunal_pilot_moeglich")
