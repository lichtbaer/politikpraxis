"""SMA-327: Dynamisches Kabinett — pool_partei, ressort, agenda, ist_kanzler

Revision ID: 033_chars_kabinett
Revises: 032_merge_031_heads
Create Date: 2026-03-18

Migration: chars-Tabelle um pool_partei, ressort, ressort_partner, agenda, ist_kanzler erweitern.
Seed: 30 Minister-Chars (5 Parteien × 6) mit pool_partei, ressort, agenda.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "033_chars_kabinett"
down_revision: Union[str, Sequence[str], None] = "032_merge_031_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add columns and seed minister pool."""
    op.add_column("chars", sa.Column("pool_partei", sa.Text(), nullable=True))
    op.add_column("chars", sa.Column("ressort", sa.Text(), nullable=True))
    op.add_column("chars", sa.Column("ressort_partner", sa.Text(), nullable=True))
    op.add_column("chars", sa.Column("agenda", postgresql.JSONB(), nullable=True))
    op.add_column("chars", sa.Column("ist_kanzler", sa.Boolean(), nullable=False, server_default="false"))

    conn = op.get_bind()

    # Kanzler markieren
    conn.execute(sa.text("UPDATE chars SET ist_kanzler = true WHERE id = 'kanzler'"))

    # Bestehende Chars mit pool_partei/ressort (Rückwärtskompatibilität)
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'cdp', ressort = 'finanzen' WHERE id = 'fm'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'cdp', ressort = 'wirtschaft' WHERE id = 'wm'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'lp', ressort = 'innen' WHERE id = 'im'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'cdp', ressort = 'justiz' WHERE id = 'jm'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'gp', ressort = 'umwelt' WHERE id = 'um'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'sdp', ressort = 'arbeit' WHERE id = 'am'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'cdp', ressort = 'gesundheit' WHERE id = 'gm'"))
    conn.execute(sa.text("UPDATE chars SET pool_partei = 'sdp', ressort = 'bildung' WHERE id = 'bm'"))

    # 30 neue Minister-Chars (5 Parteien × 6) — Partei-Pools
    # SDP: arbeit, soziales, justiz, bildung, finanzen
    # CDP: innen, finanzen, wirtschaft, justiz, bildung
    # GP: umwelt, wirtschaft, justiz, bildung, digital
    # LDP: wirtschaft, finanzen, digital, justiz, innen
    # LP: arbeit, soziales, umwelt, justiz, wohnen

    ministers = [
        # SDP (6)
        ("sdp_fm", "sdp", "finanzen", "Maria Stein", "FM", "#E3000F", 3, 4),
        ("sdp_am", "sdp", "arbeit", "Thomas Berger", "TB", "#E3000F", 4, 4),
        ("sdp_asm", "sdp", "soziales", "Laura Weber", "LW", "#E3000F", 3, 4),
        ("sdp_jm", "sdp", "justiz", "Dr. Felix Roth", "FR", "#E3000F", 3, 3),
        ("sdp_bm", "sdp", "bildung", "Anna Schulze", "AS", "#E3000F", 3, 4),
        ("sdp_im", "sdp", "innen", "Michael Koch", "MK", "#E3000F", 3, 3),
        # CDP (6)
        ("cdp_fm", "cdp", "finanzen", "Robert Lehmann", "RL", "#2D2D2D", 2, 3),
        ("cdp_wm", "cdp", "wirtschaft", "Vera Stahl", "VS", "#2D2D2D", 4, 4),
        ("cdp_im", "cdp", "innen", "Klaus Braun", "KB", "#2D2D2D", 1, 2),
        ("cdp_jm", "cdp", "justiz", "Sara Kern", "SK", "#2D2D2D", 4, 4),
        ("cdp_bm", "cdp", "bildung", "Prof. Helmut Wagner", "HW", "#2D2D2D", 3, 3),
        ("cdp_um", "cdp", "umwelt", "Christoph Berg", "CB", "#2D2D2D", 2, 3),
        # GP (6)
        ("gp_um", "gp", "umwelt", "Jonas Wolf", "JW", "#46962B", 3, 3),
        ("gp_wm", "gp", "wirtschaft", "Petra Maier", "PM", "#46962B", 4, 4),
        ("gp_jm", "gp", "justiz", "Dr. Lena Hartmann", "LH", "#46962B", 4, 4),
        ("gp_bm", "gp", "bildung", "Simon Grün", "SG", "#46962B", 3, 3),
        ("gp_digital", "gp", "digital", "Julia Becker", "JB", "#46962B", 4, 4),
        ("gp_im", "gp", "innen", "Markus Vogel", "MV", "#46962B", 3, 3),
        # LDP (6)
        ("ldp_wm", "ldp", "wirtschaft", "Vera Stahl", "VS", "#FFED00", 4, 4),
        ("ldp_fm", "ldp", "finanzen", "Robert Lehmann", "RL", "#FFED00", 3, 3),
        ("ldp_digital", "ldp", "digital", "Dr. Nina Klein", "NK", "#FFED00", 4, 4),
        ("ldp_jm", "ldp", "justiz", "Florian Beck", "FB", "#FFED00", 3, 3),
        ("ldp_im", "ldp", "innen", "Stefan Richter", "SR", "#FFED00", 3, 3),
        ("ldp_bm", "ldp", "bildung", "Katharina Wolf", "KW", "#FFED00", 3, 3),
        # LP (6)
        ("lp_am", "lp", "arbeit", "Dr. Anna Schulze", "AS", "#BE3075", 4, 4),
        ("lp_asm", "lp", "soziales", "Paul Richter", "PR", "#BE3075", 4, 4),
        ("lp_um", "lp", "umwelt", "Lisa Hoffmann", "LH", "#BE3075", 3, 3),
        ("lp_jm", "lp", "justiz", "Martin Schulz", "MS", "#BE3075", 3, 3),
        ("lp_wohnen", "lp", "wohnen", "Erik Neumann", "EN", "#BE3075", 3, 3),
        ("lp_bm", "lp", "bildung", "Sophie Bauer", "SB", "#BE3075", 3, 3),
    ]

    for char_id, pool, ressort, name, initials, color, mood, loyalty in ministers:
        conn.execute(
            sa.text("""
                INSERT INTO chars (id, initials, color, mood_start, loyalty_start, min_complexity, pool_partei, ressort,
                    ultimatum_mood_thresh, ultimatum_event_id, bonus_trigger, bonus_applies)
                VALUES (:id, :initials, :color, :mood, :loyalty, 2, :pool, :ressort, 0, NULL, NULL, NULL)
            """),
            {
                "id": char_id,
                "initials": initials,
                "color": color,
                "mood": mood,
                "loyalty": loyalty,
                "pool": pool,
                "ressort": ressort,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests)
                VALUES (:id, 'de', :name, :role, :bio, :bonus, '{}')
            """),
            {
                "id": char_id,
                "name": name,
                "role": f"Minister/in ({ressort})",
                "bio": f"Minister aus dem {pool.upper()}-Pool.",
                "bonus": "",
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests)
                VALUES (:id, 'en', :name, :role, :bio, :bonus, '{}')
            """),
            {
                "id": char_id,
                "name": name,
                "role": f"Minister ({ressort})",
                "bio": f"Minister from {pool.upper()} pool.",
                "bonus": "",
            },
        )


def downgrade() -> None:
    """Remove columns and new chars."""
    conn = op.get_bind()
    new_ids = [
        "sdp_fm", "sdp_am", "sdp_asm", "sdp_jm", "sdp_bm", "sdp_im",
        "cdp_fm", "cdp_wm", "cdp_im", "cdp_jm", "cdp_bm", "cdp_um",
        "gp_um", "gp_wm", "gp_jm", "gp_bm", "gp_digital", "gp_im",
        "ldp_wm", "ldp_fm", "ldp_digital", "ldp_jm", "ldp_im", "ldp_bm",
        "lp_am", "lp_asm", "lp_um", "lp_jm", "lp_wohnen", "lp_bm",
    ]
    for cid in new_ids:
        conn.execute(sa.text("DELETE FROM chars_i18n WHERE char_id = :cid"), {"cid": cid})
        conn.execute(sa.text("DELETE FROM chars WHERE id = :cid"), {"cid": cid})

    op.drop_column("chars", "ist_kanzler")
    op.drop_column("chars", "agenda")
    op.drop_column("chars", "ressort_partner")
    op.drop_column("chars", "ressort")
    op.drop_column("chars", "pool_partei")
