"""SMA-327/SMA-328: Dynamisches Kabinett — pool_partei, ressort, agenda, ist_kanzler

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

    # Kanzler markieren (Fallback für Stufe 1 / ohne Pool)
    conn.execute(sa.text("UPDATE chars SET ist_kanzler = true WHERE id = 'kanzler'"))

    # Alte Chars (fm, wm, im, jm, um, am, gm, bm) NICHT mit pool_partei updaten —
    # sie bleiben für Event/Initiative-FKs, werden aber nicht im Pool verwendet.

    # 30 Minister-Chars (5 Parteien × 6) — exakte Namen aus SMA-328
    # SDP: Robert Mayer (FM), Petra Maier (WM), Maria Schulze (AM), Thomas Neumann (GM), Klaus Werner (IM), Lisa Becker (BM)
    # CDP: Friedrich Schwarz (Kanzler-Kandidat), Robert Lehmann (FM), Klaus Braun (IM), Heinrich Mauer (WM), Sara Kern (JM), Monika Brandt (BM)
    # GP: Lena Fischer (Kanzlerin), Jonas Wolf (UM), Anna Grün (WM), Michael Berg (FM), Sophie Weber (JM), Felix Grau (IM)
    # LDP: Christian Frei (Kanzler), Vera Stahl (FM), Marco Digital (WM), Laura Markt (JM), Stefan Privat (IM), Nina Bildung (BM)
    # LP: Rosa Volk (Kanzlerin), Karl Voss (FM), Gerd Arbeit (AM), Inge Sozial (JM), Werner Wohn (WM), Petra Frieden (IM)

    ministers = [
        # SDP (6)
        ("sdp_fm", "sdp", "finanzen", "Robert Mayer", "RM", "#E3000F", 3, 4, {"prioritaeten": ["haushalt", "steuern"]}),
        ("sdp_wm", "sdp", "wirtschaft", "Petra Maier", "PM", "#E3000F", 4, 4, {"prioritaeten": ["arbeit", "standort"]}),
        ("sdp_am", "sdp", "arbeit", "Maria Schulze", "MS", "#E3000F", 4, 4, {"prioritaeten": ["mindestlohn", "tarifbindung"]}),
        ("sdp_gm", "sdp", "gesundheit", "Thomas Neumann", "TN", "#E3000F", 3, 4, {"prioritaeten": ["pflege", "krankenversicherung"]}),
        ("sdp_im", "sdp", "innen", "Klaus Werner", "KW", "#E3000F", 3, 3, {"prioritaeten": ["sicherheit", "integration"]}),
        ("sdp_bm", "sdp", "bildung", "Lisa Becker", "LB", "#E3000F", 3, 4, {"prioritaeten": ["chancengleichheit", "ausbildung"]}),
        # CDP (6) — Friedrich Schwarz = Kanzler-Kandidat, kein Ressort
        ("cdp_kanzler", "cdp", None, "Friedrich Schwarz", "FS", "#2D2D2D", 3, 5, None),
        ("cdp_fm", "cdp", "finanzen", "Robert Lehmann", "RL", "#2D2D2D", 2, 3, {"prioritaeten": ["schuldenbremse", "haushaltsdisziplin"]}),
        ("cdp_im", "cdp", "innen", "Klaus Braun", "KB", "#2D2D2D", 1, 2, {"prioritaeten": ["innere_sicherheit", "migration"]}),
        ("cdp_wm", "cdp", "wirtschaft", "Heinrich Mauer", "HM", "#2D2D2D", 4, 4, {"prioritaeten": ["wirtschaftswachstum", "industrie"]}),
        ("cdp_jm", "cdp", "justiz", "Sara Kern", "SK", "#2D2D2D", 4, 4, {"prioritaeten": ["rechtsstaat", "grundrechte"]}),
        ("cdp_bm", "cdp", "bildung", "Monika Brandt", "MB", "#2D2D2D", 3, 3, {"prioritaeten": ["bildung", "forschung"]}),
        # GP (6)
        ("gp_kanzlerin", "gp", None, "Lena Fischer", "LF", "#46962B", 3, 5, None),
        ("gp_um", "gp", "umwelt", "Jonas Wolf", "JW", "#46962B", 3, 3, {"prioritaeten": ["klimaschutz", "energiewende"]}),
        ("gp_wm", "gp", "wirtschaft", "Anna Grün", "AG", "#46962B", 4, 4, {"prioritaeten": ["nachhaltigkeit", "kreislaufwirtschaft"]}),
        ("gp_fm", "gp", "finanzen", "Michael Berg", "MB", "#46962B", 3, 3, {"prioritaeten": ["gruene_investitionen", "klimafinanzierung"]}),
        ("gp_jm", "gp", "justiz", "Sophie Weber", "SW", "#46962B", 4, 4, {"prioritaeten": ["buergerrechte", "umweltrecht"]}),
        ("gp_im", "gp", "innen", "Felix Grau", "FG", "#46962B", 3, 3, {"prioritaeten": ["demokratieschutz", "versammlungsrecht"]}),
        # LDP (6)
        ("ldp_kanzler", "ldp", None, "Christian Frei", "CF", "#FFED00", 3, 5, None),
        ("ldp_fm", "ldp", "finanzen", "Vera Stahl", "VS", "#FFED00", 4, 4, {"prioritaeten": ["steuerreform", "schuldenabbau"]}),
        ("ldp_wm", "ldp", "wirtschaft", "Marco Digital", "MD", "#FFED00", 4, 4, {"prioritaeten": ["digitalisierung", "innovation"]}),
        ("ldp_jm", "ldp", "justiz", "Laura Markt", "LM", "#FFED00", 3, 3, {"prioritaeten": ["buergerrechte", "wirtschaftsrecht"]}),
        ("ldp_im", "ldp", "innen", "Stefan Privat", "SP", "#FFED00", 3, 3, {"prioritaeten": ["datenschutz", "freiheitsrechte"]}),
        ("ldp_bm", "ldp", "bildung", "Nina Bildung", "NB", "#FFED00", 3, 3, {"prioritaeten": ["bildung", "startups"]}),
        # LP (6)
        ("lp_kanzlerin", "lp", None, "Rosa Volk", "RV", "#BE3075", 3, 5, None),
        ("lp_fm", "lp", "finanzen", "Karl Voss", "KV", "#BE3075", 3, 3, {"prioritaeten": ["umverteilung", "vermoegensteuer"]}),
        ("lp_am", "lp", "arbeit", "Gerd Arbeit", "GA", "#BE3075", 4, 4, {"prioritaeten": ["arbeitnehmerrechte", "mindestlohn"]}),
        ("lp_jm", "lp", "justiz", "Inge Sozial", "IS", "#BE3075", 4, 4, {"prioritaeten": ["soziale_gerechtigkeit", "antidiskriminierung"]}),
        ("lp_wm", "lp", "wirtschaft", "Werner Wohn", "WW", "#BE3075", 3, 3, {"prioritaeten": ["wohnungsbau", "mietpreisbremse"]}),
        ("lp_im", "lp", "innen", "Petra Frieden", "PF", "#BE3075", 3, 3, {"prioritaeten": ["frieden", "abruestung"]}),
    ]

    import json
    for char_id, pool, ressort, name, initials, color, mood, loyalty, agenda in ministers:
        agenda_json = json.dumps(agenda) if agenda else None
        role_de = f"Minister/in ({ressort})" if ressort else "Kanzler-Kandidat/in"
        role_en = f"Minister ({ressort})" if ressort else "Chancellor candidate"
        conn.execute(
            sa.text("""
                INSERT INTO chars (id, initials, color, mood_start, loyalty_start, min_complexity, pool_partei, ressort,
                    ultimatum_mood_thresh, ultimatum_event_id, bonus_trigger, bonus_applies, agenda)
                VALUES (:id, :initials, :color, :mood, :loyalty, 2, :pool, :ressort, 0, NULL, NULL, NULL,
                    CASE WHEN :agenda IS NOT NULL THEN CAST(:agenda AS jsonb) ELSE NULL END)
            """),
            {
                "id": char_id,
                "initials": initials,
                "color": color,
                "mood": mood,
                "loyalty": loyalty,
                "pool": pool,
                "ressort": ressort,
                "agenda": agenda_json,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests)
                VALUES (:id, 'de', :name, :role_de, :bio_de, NULL, '{}')
            """),
            {
                "id": char_id,
                "name": name,
                "role_de": role_de,
                "bio_de": f"Minister/in aus dem {pool.upper()}-Pool.",
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests)
                VALUES (:id, 'en', :name, :role_en, :bio_en, NULL, '{}')
            """),
            {
                "id": char_id,
                "name": name,
                "role_en": role_en,
                "bio_en": f"Minister from {pool.upper()} pool.",
            },
        )


def downgrade() -> None:
    """Remove columns and new chars."""
    conn = op.get_bind()
    new_ids = [
        "sdp_fm", "sdp_wm", "sdp_am", "sdp_gm", "sdp_im", "sdp_bm",
        "cdp_kanzler", "cdp_fm", "cdp_im", "cdp_wm", "cdp_jm", "cdp_bm",
        "gp_kanzlerin", "gp_um", "gp_wm", "gp_fm", "gp_jm", "gp_im",
        "ldp_kanzler", "ldp_fm", "ldp_wm", "ldp_jm", "ldp_im", "ldp_bm",
        "lp_kanzlerin", "lp_fm", "lp_am", "lp_jm", "lp_wm", "lp_im",
    ]
    for cid in new_ids:
        conn.execute(sa.text("DELETE FROM chars_i18n WHERE char_id = :cid"), {"cid": cid})
        conn.execute(sa.text("DELETE FROM chars WHERE id = :cid"), {"cid": cid})

    op.drop_column("chars", "ist_kanzler")
    op.drop_column("chars", "agenda")
    op.drop_column("chars", "ressort_partner")
    op.drop_column("chars", "ressort")
    op.drop_column("chars", "pool_partei")
