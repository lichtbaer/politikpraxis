"""Kommunal-Initiative Events + Vorstufen-Erfolg Events (SMA-275)

Revision ID: 013_kommunal_vorstufen
Revises: 012_vorstufen_stadttypen
Create Date: 2025-03-17

3 Kommunal-Initiative Events (bottom-up) + 2 Vorstufen-Erfolg-Events als Seed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "013_kommunal_vorstufen"
down_revision: Union[str, Sequence[str], None] = "012_vorstufen_stadttypen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add trigger columns to events and seed 5 neue Events."""
    # --- Migration 1: Trigger-Spalten für kommunal_initiative ---
    op.add_column(
        "events",
        sa.Column("politikfeld_id", sa.Text(), sa.ForeignKey("politikfelder.id"), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("trigger_druck_min", sa.Integer(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("trigger_milieu_key", sa.Text(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("trigger_milieu_op", sa.Text(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("trigger_milieu_val", sa.Integer(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("gesetz_ref", postgresql.ARRAY(sa.Text()), nullable=True),
    )

    conn = op.get_bind()

    # --- Migration 2: 3 Kommunal-Initiative Events ---
    kommunal_events = [
        # id, event_type, politikfeld_id, min_complexity, trigger_druck_min, trigger_milieu_key, trigger_milieu_op, trigger_milieu_val, gesetz_ref
        ("kommunal_klima_initiative", "kommunal_initiative", "umwelt_energie", 2, 60, "postmaterielle", ">", 60, ["klimaschutz", "ee"]),
        ("kommunal_sozial_initiative", "kommunal_initiative", "arbeit_soziales", 2, 55, "soziale_mitte", "<", 45, ["mindestlohn", "pflegereform"]),
        ("kommunal_sicherheit_initiative", "kommunal_initiative", "innere_sicherheit", 2, 65, "traditionelle", ">", 55, ["sicherheit_paket"]),
    ]

    for eid, etype, pfid, minc, tdruck, tmk, tmo, tmv, gref in kommunal_events:
        gesetz_ref_sql = "{" + ",".join(f'"{g}"' for g in gref) + "}" if gref else "{}"
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, politikfeld_id, min_complexity,
                    trigger_druck_min, trigger_milieu_key, trigger_milieu_op, trigger_milieu_val, gesetz_ref)
                VALUES (:id, :etype, :pfid, :minc, :tdruck, :tmk, :tmo, :tmv, CAST(:gref AS text[]))
            """),
            {"id": eid, "etype": etype, "pfid": pfid, "minc": minc, "tdruck": tdruck, "tmk": tmk, "tmo": tmo, "tmv": tmv, "gref": gesetz_ref_sql},
        )

    # --- 2 Vorstufen-Erfolg Events (kein Trigger) ---
    vorstufen_events = [
        ("vorstufe_kommunal_erfolg", "vorstufe_erfolg", None, 2),
        ("vorstufe_laender_erfolg", "vorstufe_erfolg", None, 2),
    ]
    for eid, etype, pfid, minc in vorstufen_events:
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, politikfeld_id, min_complexity)
                VALUES (:id, :etype, :pfid, :minc)
            """),
            {"id": eid, "etype": etype, "pfid": pfid, "minc": minc},
        )

    # --- events_i18n (DE) ---
    kommunal_i18n_de = [
        ("kommunal_klima_initiative", "Kommunal-Initiative", "Hamburg und München starten Klimaschutz-Eigenprogramm",
         "„Wir warten nicht länger auf den Bund.\"",
         "Großstädte haben eigenständig Klimaschutzmaßnahmen beschlossen. Der Druck aus der Zivilgesellschaft und postmateriellen Milieus ist hoch.",
         "Hamburg und München: Eigenes Klimaprogramm — Bund unter Druck"),
        ("kommunal_sozial_initiative", "Kommunal-Initiative", "Ruhrgebiet-Städte fordern Mindestlohnerhöhung — jetzt",
         "„Unsere Bürger können nicht warten.\"",
         "Industriestädte im Ruhrgebiet haben kommunale Mindestlohn-Initiativen gestartet. Die soziale Mitte fühlt sich von der Bundespolitik im Stich gelassen.",
         "Ruhrgebiet: Städte fordern Mindestlohnerhöhung — Regierung unter Beobachtung"),
        ("kommunal_sicherheit_initiative", "Kommunal-Initiative", "Städte fordern mehr Polizeipräsenz — eigenständige Maßnahmen",
         "„Der Bund handelt nicht — wir müssen es tun.\"",
         "Kommunen haben eigenständig Sicherheitsmaßnahmen angekündigt. Traditionelle Wähler fordern mehr Handlungsfähigkeit vom Bund.",
         "Kommunen starten eigene Sicherheitsinitiativen — Bund reagiert"),
    ]
    for eid, tl, title, quote, context, ticker in kommunal_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "tl": tl, "title": title, "quote": quote, "context": context, "ticker": ticker},
        )

    vorstufen_i18n_de = [
        ("vorstufe_kommunal_erfolg", "Vorstufen-Erfolg", "Pilotprojekt [Stadtname]: Erfolg bestätigt",
         "„Das Modell funktioniert — Zeit für den Bund.\"",
         "Das kommunale Pilotprojekt war erfolgreich. Die Erfahrungen bestätigen die Wirksamkeit — Zeit für die bundesweite Umsetzung.",
         "Kommunal-Pilot erfolgreich — Signal für Bund"),
        ("vorstufe_laender_erfolg", "Vorstufen-Erfolg", "[Bundesland] beschließt [Gesetz] — Signalwirkung für Bund",
         "„Andere Länder beobachten das aufmerksam.\"",
         "Ein Bundesland hat das Gesetz als Pilot erfolgreich umgesetzt. Die Signalwirkung für andere Länder und den Bund ist groß.",
         "Länder-Pilot erfolgreich — andere Länder beobachten"),
    ]
    for eid, tl, title, quote, context, ticker in vorstufen_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "tl": tl, "title": title, "quote": quote, "context": context, "ticker": ticker},
        )

    # --- event_choices + event_choices_i18n ---
    # Kommunal: als_vorbild (0 PK, +2% BT), koordinieren (8 PK, startKommunalPilot), ignorieren (0 PK)
    # Vorstufe kommunal: zur_kenntnis (1 Choice)
    # Vorstufe Länder: weitere_laender_einladen (12 PK, +10% Erfolgschance) / zur_kenntnis

    # Get next choice id
    max_id_result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    choice_id = max_id_result.scalar() + 1

    kommunal_choices = [
        # kommunal_klima_initiative
        ("kommunal_klima_initiative", "als_vorbild", "safe", 0, "Als Vorbild würdigen", "+2% BT-Stimmen für passende Gesetze, keine PK-Kosten.", "Kommunale Initiative als Vorbild gewürdigt. Positive Signalwirkung."),
        ("kommunal_klima_initiative", "koordinieren", "primary", 8, "Koordinieren und Pilot starten", "8 PK — voller Kommunal-Pilot mit dem passenden Gesetz.", "Bund koordiniert kommunale Initiative. Pilotprojekt gestartet."),
        ("kommunal_klima_initiative", "ignorieren", "danger", 0, "Ignorieren", "Keine Reaktion. Druck könnte steigen.", "Kommunale Initiative ignoriert. Unmut in den Städten."),
        # kommunal_sozial_initiative
        ("kommunal_sozial_initiative", "als_vorbild", "safe", 0, "Als Vorbild würdigen", "+2% BT-Stimmen für passende Gesetze, keine PK-Kosten.", "Kommunale Initiative als Vorbild gewürdigt."),
        ("kommunal_sozial_initiative", "koordinieren", "primary", 8, "Koordinieren und Pilot starten", "8 PK — voller Kommunal-Pilot.", "Bund koordiniert. Pilotprojekt gestartet."),
        ("kommunal_sozial_initiative", "ignorieren", "danger", 0, "Ignorieren", "Keine Reaktion.", "Kommunale Initiative ignoriert."),
        # kommunal_sicherheit_initiative
        ("kommunal_sicherheit_initiative", "als_vorbild", "safe", 0, "Als Vorbild würdigen", "+2% BT-Stimmen für passende Gesetze, keine PK-Kosten.", "Kommunale Initiative als Vorbild gewürdigt."),
        ("kommunal_sicherheit_initiative", "koordinieren", "primary", 8, "Koordinieren und Pilot starten", "8 PK — voller Kommunal-Pilot.", "Bund koordiniert. Pilotprojekt gestartet."),
        ("kommunal_sicherheit_initiative", "ignorieren", "danger", 0, "Ignorieren", "Keine Reaktion.", "Kommunale Initiative ignoriert."),
    ]

    for event_id, ckey, ctype, cost, label, desc, log in kommunal_choices:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf)
                VALUES (:id, :event_id, :choice_key, :choice_type, :cost, 0, 0, 0, 0)
            """),
            {"id": choice_id, "event_id": event_id, "choice_key": ckey, "choice_type": ctype, "cost": cost},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label, "desc": desc, "log_msg": log},
        )
        choice_id += 1

    # Vorstufe kommunal: 1 Choice
    conn.execute(
        sa.text("""
            INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf)
            VALUES (:id, 'vorstufe_kommunal_erfolg', 'zur_kenntnis', 'safe', 0, 0, 0, 0, 0)
        """),
        {"id": choice_id},
    )
    conn.execute(
        sa.text("""
            INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
            VALUES (:id, 'de', 'Zur Kenntnis nehmen', 'Erfolg bestätigt. Bonus wird angewendet.', 'Pilotprojekt-Erfolg zur Kenntnis genommen.')
        """),
        {"id": choice_id},
    )
    choice_id += 1

    # Vorstufe Länder: 2 Choices
    conn.execute(
        sa.text("""
            INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf)
            VALUES (:id, 'vorstufe_laender_erfolg', 'weitere_laender_einladen', 'primary', 12, 0, 0, 0, 0)
        """),
        {"id": choice_id},
    )
    conn.execute(
        sa.text("""
            INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
            VALUES (:id, 'de', 'Weitere Länder einladen', '12 PK — startet zweiten Länder-Pilot mit +10% Erfolgschance.', 'Weitere Länder zum Pilot eingeladen.')
        """),
        {"id": choice_id},
    )
    choice_id += 1

    conn.execute(
        sa.text("""
            INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf)
            VALUES (:id, 'vorstufe_laender_erfolg', 'zur_kenntnis', 'safe', 0, 0, 0, 0, 0)
        """),
        {"id": choice_id},
    )
    conn.execute(
        sa.text("""
            INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
            VALUES (:id, 'de', 'Zur Kenntnis nehmen', 'Erfolg bestätigt.', 'Länder-Pilot-Erfolg zur Kenntnis genommen.')
        """),
        {"id": choice_id},
    )


def downgrade() -> None:
    """Remove trigger columns and 5 Events."""
    conn = op.get_bind()

    event_ids = [
        "kommunal_klima_initiative", "kommunal_sozial_initiative", "kommunal_sicherheit_initiative",
        "vorstufe_kommunal_erfolg", "vorstufe_laender_erfolg",
    ]

    for eid in event_ids:
        conn.execute(sa.text("DELETE FROM event_choices_i18n WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    op.drop_column("events", "gesetz_ref")
    op.drop_column("events", "trigger_milieu_val")
    op.drop_column("events", "trigger_milieu_op")
    op.drop_column("events", "trigger_milieu_key")
    op.drop_column("events", "trigger_druck_min")
    op.drop_column("events", "politikfeld_id")
