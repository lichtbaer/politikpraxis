"""Ideologie-Felder, Milieus, Politikfelder, Verbände — Schema

Revision ID: 004_ideologie
Revises: 003_seed_en
Create Date: 2025-03-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_ideologie"
down_revision: Union[str, Sequence[str], None] = "003_seed_en"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ideologie columns, create milieus, politikfelder, verbaende, ministerial_initiativen."""
    # --- Ideologie-Felder für chars und gesetze ---
    for table in ("gesetze", "chars"):
        op.add_column(
            table,
            sa.Column(
                "ideologie_wirtschaft", sa.Integer(), nullable=True, server_default="0"
            ),
        )
        op.add_column(
            table,
            sa.Column(
                "ideologie_gesellschaft",
                sa.Integer(),
                nullable=True,
                server_default="0",
            ),
        )
        op.add_column(
            table,
            sa.Column(
                "ideologie_staat", sa.Integer(), nullable=True, server_default="0"
            ),
        )

    # --- politikfelder (vor gesetze-Erweiterung, da FK) ---
    op.create_table(
        "politikfelder",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("verband_id", sa.Text(), nullable=True),
        sa.Column(
            "vernachlaessigung_start", sa.Integer(), nullable=True, server_default="0"
        ),
        sa.Column(
            "druck_event_id", sa.Text(), sa.ForeignKey("events.id"), nullable=True
        ),
        sa.Column("eu_relevanz", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("kommunal_relevanz", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
    )

    op.create_table(
        "politikfelder_i18n",
        sa.Column(
            "feld_id", sa.Text(), sa.ForeignKey("politikfelder.id"), primary_key=True
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kurz", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_politikfelder_i18n_feld_id_locale",
        "politikfelder_i18n",
        ["feld_id", "locale"],
        unique=True,
    )

    # --- Politikfeld-Zuordnung für Gesetze ---
    op.add_column(
        "gesetze",
        sa.Column(
            "politikfeld_id",
            sa.Text(),
            sa.ForeignKey("politikfelder.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "politikfeld_sekundaer",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )

    # --- milieus ---
    op.create_table(
        "milieus",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("gewicht", sa.Integer(), nullable=False),
        sa.Column("basisbeteiligung", sa.Integer(), nullable=False),
        sa.Column(
            "ideologie_wirtschaft", sa.Integer(), nullable=True, server_default="0"
        ),
        sa.Column(
            "ideologie_gesellschaft", sa.Integer(), nullable=True, server_default="0"
        ),
        sa.Column("ideologie_staat", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("aggregat_gruppe", sa.Text(), nullable=True),
    )

    op.create_table(
        "milieus_i18n",
        sa.Column(
            "milieu_id", sa.Text(), sa.ForeignKey("milieus.id"), primary_key=True
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kurzcharakter", sa.Text(), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_milieus_i18n_milieu_id_locale",
        "milieus_i18n",
        ["milieu_id", "locale"],
        unique=True,
    )

    # --- verbaende ---
    op.create_table(
        "verbaende",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "politikfeld_id",
            sa.Text(),
            sa.ForeignKey("politikfelder.id"),
            nullable=False,
        ),
        sa.Column(
            "ideologie_wirtschaft", sa.Integer(), nullable=True, server_default="0"
        ),
        sa.Column(
            "ideologie_gesellschaft", sa.Integer(), nullable=True, server_default="0"
        ),
        sa.Column("ideologie_staat", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("beziehung_start", sa.Integer(), nullable=False),
        sa.Column("staerke_bund", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("staerke_eu", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("staerke_laender", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("staerke_kommunen", sa.Integer(), nullable=True, server_default="1"),
        sa.Column(
            "konflikt_mit",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="2"),
    )

    op.create_table(
        "verbaende_i18n",
        sa.Column(
            "verband_id", sa.Text(), sa.ForeignKey("verbaende.id"), primary_key=True
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("kurz", sa.Text(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_verbaende_i18n_verband_id_locale",
        "verbaende_i18n",
        ["verband_id", "locale"],
        unique=True,
    )

    op.create_table(
        "verbands_tradeoffs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "verband_id", sa.Text(), sa.ForeignKey("verbaende.id"), nullable=False
        ),
        sa.Column("tradeoff_key", sa.Text(), nullable=False),
        sa.Column("effekt_al", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_hh", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_gi", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("effekt_zf", sa.Numeric(5, 2), nullable=True, server_default="0"),
        sa.Column("feld_druck_delta", sa.Integer(), nullable=True, server_default="0"),
    )

    op.create_table(
        "verbands_tradeoffs_i18n",
        sa.Column(
            "tradeoff_id",
            sa.Integer(),
            sa.ForeignKey("verbands_tradeoffs.id"),
            primary_key=True,
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_verbands_tradeoffs_i18n_tradeoff_id_locale",
        "verbands_tradeoffs_i18n",
        ["tradeoff_id", "locale"],
        unique=True,
    )

    # --- ministerial_initiativen ---
    op.create_table(
        "ministerial_initiativen",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("char_id", sa.Text(), sa.ForeignKey("chars.id"), nullable=False),
        sa.Column(
            "gesetz_ref_id", sa.Text(), sa.ForeignKey("gesetze.id"), nullable=True
        ),
        sa.Column("trigger_type", sa.Text(), nullable=False),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="3"),
        sa.Column("cooldown_months", sa.Integer(), nullable=True, server_default="8"),
    )

    op.create_table(
        "ministerial_initiativen_i18n",
        sa.Column(
            "initiative_id",
            sa.Text(),
            sa.ForeignKey("ministerial_initiativen.id"),
            primary_key=True,
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("titel", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_ministerial_initiativen_i18n_initiative_id_locale",
        "ministerial_initiativen_i18n",
        ["initiative_id", "locale"],
        unique=True,
    )

    # verband_id in politikfelder: optional, kein FK (zirkuläre Abhängigkeit mit verbaende)


def downgrade() -> None:
    """Remove ideologie columns and new tables."""
    op.drop_index(
        "ix_ministerial_initiativen_i18n_initiative_id_locale",
        "ministerial_initiativen_i18n",
    )
    op.drop_table("ministerial_initiativen_i18n")
    op.drop_table("ministerial_initiativen")

    op.drop_index(
        "ix_verbands_tradeoffs_i18n_tradeoff_id_locale", "verbands_tradeoffs_i18n"
    )
    op.drop_table("verbands_tradeoffs_i18n")
    op.drop_table("verbands_tradeoffs")

    op.drop_index("ix_verbaende_i18n_verband_id_locale", "verbaende_i18n")
    op.drop_table("verbaende_i18n")
    op.drop_table("verbaende")

    op.drop_index("ix_milieus_i18n_milieu_id_locale", "milieus_i18n")
    op.drop_table("milieus_i18n")
    op.drop_table("milieus")

    op.drop_column("gesetze", "politikfeld_sekundaer")
    op.drop_column("gesetze", "politikfeld_id")

    op.drop_index("ix_politikfelder_i18n_feld_id_locale", "politikfelder_i18n")
    op.drop_table("politikfelder_i18n")
    op.drop_table("politikfelder")

    for table in ("gesetze", "chars"):
        op.drop_column(table, "ideologie_staat")
        op.drop_column(table, "ideologie_gesellschaft")
        op.drop_column(table, "ideologie_wirtschaft")
