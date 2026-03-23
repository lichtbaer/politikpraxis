"""Parteisystem — Fiktive Parteien, Bundesrat-Fraktionen (SMA-288)

Revision ID: 021_parteien
Revises: 020_extremismus_events
Create Date: 2025-03-17

Migration: parteien + parteien_i18n Tabellen, partei_id in bundesrat_fraktionen,
partei_id in chars (Kanzler), Seed-Daten DE+EN.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "021_parteien"
down_revision: Union[str, Sequence[str], None] = "020_extremismus_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create parteien tables, add partei_id to bundesrat_fraktionen and chars."""
    conn = op.get_bind()

    # --- parteien ---
    op.create_table(
        "parteien",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("kuerzel", sa.Text(), nullable=False),
        sa.Column("farbe", sa.Text(), nullable=False),
        sa.Column("ideologie_wirtschaft", sa.Integer(), nullable=False),
        sa.Column("ideologie_gesellschaft", sa.Integer(), nullable=False),
        sa.Column("ideologie_staat", sa.Integer(), nullable=False),
        sa.Column("korridor_w_min", sa.Integer(), nullable=True),
        sa.Column("korridor_w_max", sa.Integer(), nullable=True),
        sa.Column("korridor_g_min", sa.Integer(), nullable=True),
        sa.Column("korridor_g_max", sa.Integer(), nullable=True),
        sa.Column("korridor_s_min", sa.Integer(), nullable=True),
        sa.Column("korridor_s_max", sa.Integer(), nullable=True),
        sa.Column("spielbar", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "parteien_i18n",
        sa.Column(
            "partei_id", sa.Text(), sa.ForeignKey("parteien.id"), primary_key=True
        ),
        sa.Column(
            "locale",
            postgresql.ENUM("de", "en", name="content_locale", create_type=False),
            primary_key=True,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("desc", sa.Text(), nullable=False),
        sa.Column("kernthemen", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_parteien_i18n_partei_id_locale",
        "parteien_i18n",
        ["partei_id", "locale"],
        unique=True,
    )

    # --- Seed parteien (5 fiktive Parteien) ---
    parteien_data = [
        (
            "sdp",
            "SDP",
            "#E3000F",
            -40,
            -20,
            -40,
            None,
            None,
            None,
            None,
            None,
            None,
            True,
        ),
        ("cdp", "CDP", "#2D2D2D", 20, 30, 20, None, None, None, None, None, None, True),
        (
            "gp",
            "GP",
            "#46962B",
            -50,
            -70,
            -20,
            None,
            None,
            None,
            None,
            None,
            None,
            False,
        ),
        (
            "ldp",
            "LDP",
            "#FFED00",
            60,
            -10,
            60,
            None,
            None,
            None,
            None,
            None,
            None,
            True,
        ),
        (
            "lp",
            "LP",
            "#BE3075",
            -65,
            -40,
            -60,
            None,
            None,
            None,
            None,
            None,
            None,
            True,
        ),
    ]
    for row in parteien_data:
        conn.execute(
            sa.text("""
                INSERT INTO parteien (id, kuerzel, farbe, ideologie_wirtschaft, ideologie_gesellschaft,
                    ideologie_staat, korridor_w_min, korridor_w_max, korridor_g_min, korridor_g_max,
                    korridor_s_min, korridor_s_max, spielbar)
                VALUES (:id, :kuerzel, :farbe, :iw, :ig, :is, :kwmin, :kwmax, :kgmin, :kgmax, :ksmin, :ksmax, :spielbar)
            """),
            {
                "id": row[0],
                "kuerzel": row[1],
                "farbe": row[2],
                "iw": row[3],
                "ig": row[4],
                "is": row[5],
                "kwmin": row[6],
                "kwmax": row[7],
                "kgmin": row[8],
                "kgmax": row[9],
                "ksmin": row[10],
                "ksmax": row[11],
                "spielbar": row[12],
            },
        )

    # --- parteien_i18n DE ---
    parteien_i18n_de = [
        (
            "sdp",
            "de",
            "Sozialdemokratische Partei",
            "Sozialdemokratische Partei.",
            "Soziales, Arbeit, Infrastruktur",
        ),
        (
            "cdp",
            "de",
            "Christlich-Demokratische Partei",
            "Christlich-Demokratische Partei.",
            "Wirtschaft, Sicherheit, Tradition",
        ),
        ("gp", "de", "Grüne Partei", "Grüne Partei.", "Klima, Umwelt, Nachhaltigkeit"),
        (
            "ldp",
            "de",
            "Liberal-Demokratische Partei",
            "Liberal-Demokratische Partei.",
            "Marktwirtschaft, Freiheit, Bürokratieabbau",
        ),
        (
            "lp",
            "de",
            "Linke Partei",
            "Linke Partei.",
            "Soziale Gerechtigkeit, Umverteilung, Frieden",
        ),
    ]
    for pid, loc, name, description, kt in parteien_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO parteien_i18n (partei_id, locale, name, "desc", kernthemen)
                VALUES (:pid, :locale, :name, :description, :kernthemen)
            """),
            {
                "pid": pid,
                "locale": loc,
                "name": name,
                "description": description,
                "kernthemen": kt,
            },
        )

    # --- parteien_i18n EN ---
    parteien_i18n_en = [
        (
            "sdp",
            "en",
            "Social Democratic Party",
            "Social Democratic Party.",
            "Social, Labour, Infrastructure",
        ),
        (
            "cdp",
            "en",
            "Christian Democratic Party",
            "Christian Democratic Party.",
            "Economy, Security, Tradition",
        ),
        (
            "gp",
            "en",
            "Green Party",
            "Green Party.",
            "Climate, Environment, Sustainability",
        ),
        (
            "ldp",
            "en",
            "Liberal Democratic Party",
            "Liberal Democratic Party.",
            "Market economy, Freedom, Deregulation",
        ),
        (
            "lp",
            "en",
            "Left Party",
            "Left Party.",
            "Social justice, Redistribution, Peace",
        ),
    ]
    for pid, loc, name, description, kt in parteien_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO parteien_i18n (partei_id, locale, name, "desc", kernthemen)
                VALUES (:pid, :locale, :name, :description, :kernthemen)
            """),
            {
                "pid": pid,
                "locale": loc,
                "name": name,
                "description": description,
                "kernthemen": kt,
            },
        )

    # --- partei_id zu bundesrat_fraktionen ---
    op.add_column(
        "bundesrat_fraktionen",
        sa.Column("partei_id", sa.Text(), sa.ForeignKey("parteien.id"), nullable=True),
    )

    # Mapping: Sprecher -> partei_id (Petra Schulz, Hans Brenner -> sdp; Edmund Huber, Matthias Kohl -> cdp)
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen SET partei_id = 'sdp'
            WHERE id IN (
                SELECT fraktion_id FROM bundesrat_fraktionen_i18n
                WHERE sprecher_name IN ('Petra Schulz', 'Hans Brenner')
            )
        """)
    )
    conn.execute(
        sa.text("""
            UPDATE bundesrat_fraktionen SET partei_id = 'cdp'
            WHERE id IN (
                SELECT fraktion_id FROM bundesrat_fraktionen_i18n
                WHERE sprecher_name IN ('Edmund Huber', 'Matthias Kohl')
            )
        """)
    )

    # --- partei_id zu chars (Kanzler = SDP) ---
    op.add_column(
        "chars",
        sa.Column("partei_id", sa.Text(), sa.ForeignKey("parteien.id"), nullable=True),
    )
    conn.execute(sa.text("UPDATE chars SET partei_id = 'sdp' WHERE id = 'kanzler'"))


def downgrade() -> None:
    """Remove partei_id columns and parteien tables."""
    op.drop_column("chars", "partei_id")
    op.drop_column("bundesrat_fraktionen", "partei_id")
    op.drop_table("parteien_i18n")
    op.drop_table("parteien")
