"""Chars min_complexity + 3 neue Kabinetts-Chars (Schulze, Neumann, Becker)

Revision ID: 006_chars_cabinet
Revises: 005_seed_ideologie
Create Date: 2025-03-17

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006_chars_cabinet"
down_revision: Union[str, Sequence[str], None] = "005_seed_ideologie"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add min_complexity to chars, update existing, add 3 new chars + ultimatum events."""
    conn = op.get_bind()

    # --- Schema: min_complexity für chars ---
    op.add_column(
        "chars",
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
    )

    # --- Bestehende Chars: min_complexity setzen ---
    conn.execute(
        sa.text("UPDATE chars SET min_complexity = 1 WHERE id IN ('kanzler', 'fm')")
    )
    conn.execute(
        sa.text("UPDATE chars SET min_complexity = 2 WHERE id IN ('wm', 'im', 'jm', 'um')")
    )

    # --- 3 neue Chars: am, gm, bm ---
    op.bulk_insert(
        sa.table(
            "chars",
            sa.column("id"),
            sa.column("initials"),
            sa.column("color"),
            sa.column("mood_start"),
            sa.column("loyalty_start"),
            sa.column("ultimatum_mood_thresh"),
            sa.column("ultimatum_event_id"),
            sa.column("bonus_trigger"),
            sa.column("bonus_applies"),
            sa.column("sonderregel"),
            sa.column("ideologie_wirtschaft"),
            sa.column("ideologie_gesellschaft"),
            sa.column("ideologie_staat"),
            sa.column("min_complexity"),
        ),
        [
            {
                "id": "am",
                "initials": "AS",
                "color": "#5a7898",
                "mood_start": 3,
                "loyalty_start": 4,
                "ultimatum_mood_thresh": 1,
                "ultimatum_event_id": "am_ultimatum",
                "bonus_trigger": "mood>=3",
                "bonus_applies": "gbd_regen",
                "sonderregel": "gbd_mood_sync",
                "ideologie_wirtschaft": -55,
                "ideologie_gesellschaft": -25,
                "ideologie_staat": -60,
                "min_complexity": 3,
            },
            {
                "id": "gm",
                "initials": "TN",
                "color": "#7a5898",
                "mood_start": 3,
                "loyalty_start": 3,
                "ultimatum_mood_thresh": 1,
                "ultimatum_event_id": "gm_ultimatum",
                "bonus_trigger": "mood>=3",
                "bonus_applies": "gesundheit_druck_slow",
                "sonderregel": "gesundheit_druck_mood",
                "ideologie_wirtschaft": -25,
                "ideologie_gesellschaft": -35,
                "ideologie_staat": -45,
                "min_complexity": 3,
            },
            {
                "id": "bm",
                "initials": "SB",
                "color": "#987830",
                "mood_start": 3,
                "loyalty_start": 3,
                "ultimatum_mood_thresh": 1,
                "ultimatum_event_id": "bm_ultimatum",
                "bonus_trigger": "mood>=3",
                "bonus_applies": "bildung_br_rabatt",
                "sonderregel": "bildung_foederalismus",
                "ideologie_wirtschaft": -15,
                "ideologie_gesellschaft": -45,
                "ideologie_staat": -65,
                "min_complexity": 4,
            },
        ],
    )

    # --- chars_i18n für am, gm, bm (DE) ---
    op.bulk_insert(
        sa.table(
            "chars_i18n",
            sa.column("char_id"),
            sa.column("locale"),
            sa.column("name"),
            sa.column("role"),
            sa.column("bio"),
            sa.column("bonus_desc"),
            sa.column("interests"),
            sa.column("keyword"),
        ),
        [
            {
                "char_id": "am",
                "locale": "de",
                "name": "Dr. Anna Schulze",
                "role": "Arbeits- und Sozialministerin",
                "bio": "Gewerkschaftsnah und kampfeslustig. Schulze kennt die Betriebe von innen und fordert konsequent für Mindestlohn und Tarifbindung.",
                "bonus_desc": "GBD-Beziehung regeneriert passiv wenn Mood ≥ 3",
                "interests": ["Mindestlohn", "Tarifbindung", "Sozialleistungen"],
                "keyword": "Kämpferin",
            },
            {
                "char_id": "gm",
                "locale": "de",
                "name": "Prof. Thomas Neumann",
                "role": "Gesundheits- und Pflegeminister",
                "bio": "Klinischer Pragmatiker. Neumann denkt in Systemen und sucht nachhaltige Lösungen für Pflege und Krankenversicherung.",
                "bonus_desc": "Gesundheitsfeld-Druck steigt langsamer wenn Mood ≥ 3",
                "interests": ["Pflegefinanzierung", "Krankenversicherung", "Prävention"],
                "keyword": "Systematiker",
            },
            {
                "char_id": "bm",
                "locale": "de",
                "name": "Dr. Sabine Becker",
                "role": "Bildungs- und Forschungsministerin",
                "bio": "Unermüdliche Reformerin mit Föderalismusfrust. Becker will Bund und Länder zusammenbringen — oft vergeblich.",
                "bonus_desc": "Bundesrat-Blockade bei Bildungsgesetzen -15% wenn Mood ≥ 3",
                "interests": ["Bildungsföderalismus", "Kitaausbau", "Forschungsförderung"],
                "keyword": "Reformerin",
            },
        ],
    )

    # --- chars_i18n für am, gm, bm (EN) ---
    op.bulk_insert(
        sa.table(
            "chars_i18n",
            sa.column("char_id"),
            sa.column("locale"),
            sa.column("name"),
            sa.column("role"),
            sa.column("bio"),
            sa.column("bonus_desc"),
            sa.column("interests"),
            sa.column("keyword"),
        ),
        [
            {
                "char_id": "am",
                "locale": "en",
                "name": "Dr. Anna Schulze",
                "role": "Minister for Labour and Social Affairs",
                "bio": "Union-friendly and combative. Schulze knows the companies from the inside and consistently demands minimum wage and collective bargaining.",
                "bonus_desc": "GBD relationship regenerates passively when Mood ≥ 3",
                "interests": ["Minimum wage", "Collective bargaining", "Social benefits"],
                "keyword": "Fighter",
            },
            {
                "char_id": "gm",
                "locale": "en",
                "name": "Prof. Thomas Neumann",
                "role": "Minister for Health and Care",
                "bio": "Clinical pragmatist. Neumann thinks in systems and seeks sustainable solutions for care and health insurance.",
                "bonus_desc": "Health field pressure rises more slowly when Mood ≥ 3",
                "interests": ["Care financing", "Health insurance", "Prevention"],
                "keyword": "Systematic",
            },
            {
                "char_id": "bm",
                "locale": "en",
                "name": "Dr. Sabine Becker",
                "role": "Minister for Education and Research",
                "bio": "Tireless reformer with federalism frustration. Becker wants to bring federal and state levels together — often in vain.",
                "bonus_desc": "Bundesrat blockade for education laws -15% when Mood ≥ 3",
                "interests": ["Education federalism", "Childcare expansion", "Research funding"],
                "keyword": "Reformer",
            },
        ],
    )

    # --- 3 Ultimatum-Events ---
    events_data = [
        (
            "am_ultimatum",
            "char_ultimatum",
            "am",
            "Arbeitsministerium",
            "Schulze fordert Mindestlohn-Sofortprogramm",
            "„Ohne ein Sofortprogramm zum Mindestlohn kann ich dieses Kabinett nicht mehr vertreten.\"",
            "Schulze ist am Ende ihrer Geduld. Die Gewerkschaften erwarten Taten.",
            "KABINETTSKRISE: Arbeitsministerin Schulze droht mit Rücktritt",
        ),
        (
            "gm_ultimatum",
            "char_ultimatum",
            "gm",
            "Gesundheitsministerium",
            "Neumann fordert Pflegenotstand anerkennen",
            "„Wenn wir den Pflegenotstand nicht offiziell anerkennen, verliere ich jede Glaubwürdigkeit.\"",
            "Neumann sieht die Gesundheitspolitik am Scheideweg.",
            "KABINETTSKRISE: Gesundheitsminister Neumann droht mit Rücktritt",
        ),
        (
            "bm_ultimatum",
            "char_ultimatum",
            "bm",
            "Bildungsministerium",
            "Becker fordert Bildungsnotstand",
            "„Der Föderalismus blockiert jede Reform. Ohne Anerkennung des Notstands bin ich raus.\"",
            "Becker ist frustriert über die fehlenden Fortschritte in der Bildungspolitik.",
            "KABINETTSKRISE: Bildungsministerin Becker droht mit Rücktritt",
        ),
    ]

    for eid, etype, char_id, type_label, title, quote, context, ticker in events_data:
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, char_id)
                VALUES (:id, :event_type, :char_id)
            """),
            {"id": eid, "event_type": etype, "char_id": char_id},
        )
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:event_id, 'de', :type_label, :title, :quote, :context, :ticker)
            """),
            {
                "event_id": eid,
                "type_label": type_label,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    # --- event_choices für am_ultimatum, gm_ultimatum, bm_ultimatum ---
    result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    max_id = result.scalar() or 0
    choice_id = max_id + 1

    choices_data = [
        (
            "am_ultimatum",
            [
                ("sofortprogramm", "safe", 0, 0, -0.2, -0.3, -2, {"am": 2}, {"am": 1}, "Sofortprogramm beschließen", "Schulze zufrieden, Haushalt belastet", "Mindestlohn-Sofortprogramm beschlossen. Schulze besänftigt."),
                ("verhandeln", "primary", 15, 0, 0, 0, 0, {"am": 1}, {"am": 0}, "Verhandlung anbieten", "Zeitgewinn, kostet politisches Kapital", "Koalitionsgipfel zu Sozialpolitik. Kompromiss gefunden."),
                ("ablehnen", "danger", 0, 0, 0, 0, -5, {"am": -2}, {"am": -2}, "Ablehnen", "Schulze droht Rücktritt", "Forderung abgelehnt. Schulze droht mit Rücktritt."),
            ],
        ),
        (
            "gm_ultimatum",
            [
                ("pflegenotstand", "safe", 0, 0, 0, 0, 2, {"gm": 2}, {"gm": 1}, "Pflegenotstand anerkennen", "Neumann zufrieden, Druck steigt", "Pflegenotstand offiziell anerkannt. Neumann bleibt."),
                ("kommission", "primary", 10, 0, 0, 0, 0, {"gm": 1}, {"gm": 0}, "Expertenkommission einsetzen", "Zeitgewinn, Neumann kooperiert", "Kommision eingesetzt. Neumann vorläufig zufrieden."),
                ("ignorieren", "danger", 0, 0, 0, 0, -4, {"gm": -2}, {"gm": -2}, "Ignorieren", "Neumann verärgert", "Forderung ignoriert. Neumann droht mit Rücktritt."),
            ],
        ),
        (
            "bm_ultimatum",
            [
                ("bildungsnotstand", "safe", 0, 0, 0, 0, 1, {"bm": 2}, {"bm": 1}, "Bildungsnotstand anerkennen", "Becker zufrieden, Länder alarmiert", "Bildungsnotstand anerkannt. Becker bleibt."),
                ("foederalismus_reform", "primary", 20, 0, 0, 0, 0, {"bm": 1}, {"bm": 0}, "Föderalismusreform ankündigen", "Zeitgewinn, Becker kooperiert", "Föderalismusreform angekündigt. Becker vorläufig zufrieden."),
                ("ablehnen_bm", "danger", 0, 0, 0, 0, -3, {"bm": -2}, {"bm": -2}, "Ablehnen", "Becker verärgert", "Forderung abgelehnt. Becker droht mit Rücktritt."),
            ],
        ),
    ]

    for event_id, choices in choices_data:
        for c in choices:
            (ckey, ctype, cost, ea, eh, eg, ez, cm, ly, label, desc, log) = c
            cm_json = json.dumps(cm) if cm else "{}"
            ly_json = json.dumps(ly) if ly else "{}"
            conn.execute(
                sa.text("""
                    INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf, char_mood, loyalty)
                    VALUES (:id, :event_id, :choice_key, :choice_type, :cost_pk, :ea, :eh, :eg, :ez, :cm::jsonb, :ly::jsonb)
                """),
                {
                    "id": choice_id,
                    "event_id": event_id,
                    "choice_key": ckey,
                    "choice_type": ctype,
                    "cost_pk": cost,
                    "ea": ea,
                    "eh": eh,
                    "eg": eg,
                    "ez": ez,
                    "cm": cm_json,
                    "ly": ly_json,
                },
            )
            conn.execute(
                sa.text("""
                    INSERT INTO event_choices_i18n (choice_id, locale, label, desc, log_msg)
                    VALUES (:choice_id, 'de', :label, :desc, :log_msg)
                """),
                {"choice_id": choice_id, "label": label, "desc": desc, "log_msg": log},
            )
            choice_id += 1

    conn.execute(sa.text("SELECT setval('event_choices_id_seq', :max_id)"), {"max_id": choice_id - 1})


def downgrade() -> None:
    """Remove new chars, events, drop min_complexity."""
    conn = op.get_bind()

    # --- Event-Choices und Events für neue Chars ---
    for eid in ("am_ultimatum", "gm_ultimatum", "bm_ultimatum"):
        conn.execute(sa.text("DELETE FROM event_choices_i18n WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    # --- chars_i18n und chars ---
    for cid in ("am", "gm", "bm"):
        conn.execute(sa.text("DELETE FROM chars_i18n WHERE char_id = :cid"), {"cid": cid})
        conn.execute(sa.text("DELETE FROM chars WHERE id = :cid"), {"cid": cid})

    op.drop_column("chars", "min_complexity")
