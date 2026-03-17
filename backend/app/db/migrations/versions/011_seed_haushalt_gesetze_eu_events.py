"""Seed 4 Haushalt-Gesetze + 6 EU-Events (SMA-271)

Revision ID: 011_haushalt_eu
Revises: 010_eu_events
Create Date: 2025-03-17

4 neue Gesetze mit Haushaltsdimension + 6 EU-Events (3 reaktive Richtlinien, 3 Random/Fix).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "011_haushalt_eu"
down_revision: Union[str, Sequence[str], None] = "010_eu_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed 4 Haushalt-Gesetze und 6 EU-Events."""
    conn = op.get_bind()

    # --- 4 neue Haushalt-Gesetze ---
    # id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
    # foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
    # politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, investiv
    gesetze_data = [
        # id, tags, bt, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag, foed, iw, ig, is_, pf, ke, kl, einn, inv
        ("sondervermoegen_klima", ["bund", "eu"], 46, -0.5, -0.8, -0.3, 4, 6, False, -50, -80, -30, "umwelt_energie", 100.0, 0.0, 0.0, True),
        ("schuldenbremse_reform", ["bund"], 44, -0.3, -0.2, -0.7, 3, 4, False, -30, -20, -70, "wirtschaft_finanzen", 0.0, 0.0, 20.0, False),
        ("vermoegensteuer", ["bund"], 48, -0.75, -0.1, -0.3, 4, 5, False, -75, -10, -30, "wirtschaft_finanzen", 0.0, 0.0, 8.0, False),
        ("steuerreform_2", ["bund", "eu"], 54, 0.8, 0.05, 0.6, 2, 3, False, 80, 5, 60, "wirtschaft_finanzen", 0.0, 0.0, -15.0, False),
    ]

    for (
        gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, inv
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, investiv)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf, :ke, :kl, :einn, :inv)
            """),
            {
                "id": gid, "tags": tags_sql, "bt": bt, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "lag": lag,
                "foed": foed, "iw": iw, "ig": ig, "is_": is_, "pf": pf, "ke": ke, "kl": kl, "einn": einn, "inv": inv,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        ("sondervermoegen_klima", "Sondervermögen Klimaschutz", "SVK",
         "100 Mrd. Euro Sondervermögen für Klimainvestitionen. Schuldenbremse gilt nicht (Sonderkonstruktion)."),
        ("schuldenbremse_reform", "Reform der Schuldenbremse", "SBR",
         "Flexibilisierung der Schuldenbremse. Löst Lehmann-Ultimatum aus. Spielraum-Effekt +20 Mrd."),
        ("vermoegensteuer", "Wiedereinführung der Vermögenssteuer", "VSt",
         "Neue Vermögenssteuer auf hohe Privatvermögen. Einnahmen +8 Mrd. Euro."),
        ("steuerreform_2", "Unternehmenssteuerreform II", "USR2",
         "Weitere Senkung der Unternehmenssteuern. Einnahmeausfall -15 Mrd. Euro."),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'de', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- gesetze_i18n (EN) ---
    gesetze_i18n_en = [
        ("sondervermoegen_klima", "Climate Protection Special Fund", "SVK",
         "100 billion euro special fund for climate investments. Debt brake does not apply."),
        ("schuldenbremse_reform", "Debt Brake Reform", "SBR",
         "Flexibilisation of the debt brake. Triggers Lehmann ultimatum. Fiscal space effect +20 bn."),
        ("vermoegensteuer", "Reintroduction of Wealth Tax", "VSt",
         "New wealth tax on high private assets. Revenue +8 bn euros."),
        ("steuerreform_2", "Corporate Tax Reform II", "USR2",
         "Further reduction of corporate taxes. Revenue shortfall -15 bn euros."),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- 6 EU-Events ---
    eu_events_data = [
        # id, event_type, politikfeld_id, trigger_klima_min, trigger_monat, min_complexity
        ("eu_rl_mindestlohn", "reaktiv_richtlinie", "arbeit_soziales", 45, None, 3),
        ("eu_rl_lieferkette", "reaktiv_richtlinie", "wirtschaft_finanzen", 0, None, 3),
        ("eu_rl_klima", "reaktiv_richtlinie", "umwelt_energie", 65, None, 3),
        ("eu_rechtsruck", "random", None, None, None, 3),
        ("eu_gipfel_frankreich", "random", None, None, None, 3),
        ("europawahl", "fix", None, None, 12, 3),
    ]

    for eid, etype, pfid, tkmin, tmonat, minc in eu_events_data:
        conn.execute(
            sa.text("""
                INSERT INTO eu_events (id, event_type, politikfeld_id, trigger_klima_min, trigger_monat, min_complexity)
                VALUES (:id, :etype, :pfid, :tkmin, :tmonat, :minc)
            """),
            {"id": eid, "etype": etype, "pfid": pfid, "tkmin": tkmin, "tmonat": tmonat, "minc": minc},
        )

    # --- eu_events_i18n (DE) ---
    eu_events_i18n_de = [
        ("eu_rl_mindestlohn", "EU-Mindestlohn-Richtlinie", "„Brüssel verlangt verbindliche Mindestlohnstandards.\"",
         "Die EU-Richtlinie zur Angemessenheit der Mindestlöhne muss umgesetzt werden.",
         "EU-Mindestlohn-Richtlinie: Umsetzungsdruck aus Brüssel"),
        ("eu_rl_lieferkette", "EU-Lieferketten-Richtlinie", "„Sorgfaltspflichten entlang der Lieferkette werden Pflicht.\"",
         "Die EU-Richtlinie zu nachhaltigen Lieferketten verlangt nationale Umsetzung.",
         "EU-Lieferketten-Richtlinie: Unternehmen unter Druck"),
        ("eu_rl_klima", "EU-Klimaschutz-Verschärfung", "„Die Klimaziele werden verschärft — Deutschland muss nachziehen.\"",
         "Brüssel verschärft die Klimavorgaben. Hohe Kofinanzierung erforderlich.",
         "EU verschärft Klimaziele — nationale Anpassung nötig"),
        ("eu_rechtsruck", "Europäischer Rechtsruck", "„Rechtspopulistische Parteien gewinnen in mehreren Mitgliedstaaten.\"",
         "Die politische Stimmung in Europa verschiebt sich. Koalitionspartner reagieren besorgt.",
         "Rechtsruck in Europa — Regierung unter Beobachtung"),
        ("eu_gipfel_frankreich", "Deutsch-Französischer Gipfel", "„Paris und Berlin müssen gemeinsame Positionen finden.\"",
         "Der Deutsch-Französische Gipfel steht an. Alle EU-Routen haben -15% PK für 4 Monate.",
         "Deutsch-Französischer Gipfel — Verhandlungsmarathon"),
        ("europawahl", "Europawahl", "„Die Europawahl hat stattgefunden — die Ergebnisse liegen vor.\"",
         "Die Europawahl verändert die EU-Klima-Werte in allen Feldern um ±10.",
         "Europawahl abgeschlossen — neue Mehrheiten in Brüssel"),
    ]

    for eid, title, quote, context, ticker in eu_events_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO eu_events_i18n (event_id, locale, title, quote, context, ticker)
                VALUES (:eid, 'de', :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "title": title, "quote": quote, "context": context, "ticker": ticker},
        )

    # --- eu_event_choices (choice_key, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf, eu_klima_delta, kofinanzierung)
    # 1. Mindestlohn: sofort_umsetzen / minimal_umsetzen / klagen
    # 2. Lieferkette: sofort / minimal / klagen
    # 3. Klima: sofort / minimal / klagen
    # 4. Rechtsruck: reagieren / neutral / gegenposition
    # 5. Gipfel: thema_a / thema_b / beide_neutral
    # 6. Europawahl: zur_kenntnis (1 Choice)

    choice_id = 1
    choices_data = [
        # eu_rl_mindestlohn
        ("eu_rl_mindestlohn", "sofort_umsetzen", 0, 0, 0, 0, 0, 8, 0.20, "Sofort umsetzen", "Vollständige Umsetzung. Kofinanzierung 20%, GBD +8.", "EU-Mindestlohn-Richtlinie vollständig umgesetzt."),
        ("eu_rl_mindestlohn", "minimal_umsetzen", 0, 0, 0, 0, 0, 0, 0.10, "Minimal umsetzen", "Wirkung -30%, Kofinanzierung 10%. BdI -5.", "EU-Mindestlohn-Richtlinie minimal umgesetzt."),
        ("eu_rl_mindestlohn", "klagen", 0, 0, 0, 0, 0, 0, 0.0, "Klagen", "12 Monate Aufschub, 30% Erfolgschance.", "Klage gegen EU-Mindestlohn-Richtlinie eingereicht."),
        # eu_rl_lieferkette
        ("eu_rl_lieferkette", "sofort_umsetzen", 0, 0, 0, 0, 0, 0, 0.20, "Sofort umsetzen", "Vollständige Umsetzung der Lieferketten-Richtlinie.", "EU-Lieferketten-Richtlinie umgesetzt."),
        ("eu_rl_lieferkette", "minimal_umsetzen", 0, 0, 0, 0, 0, 0, 0.10, "Minimal umsetzen", "Minimale Umsetzung, Wirkung -30%.", "EU-Lieferketten-Richtlinie minimal umgesetzt."),
        ("eu_rl_lieferkette", "klagen", 0, 0, 0, 0, 0, 0, 0.0, "Klagen", "12 Monate Aufschub, 30% Erfolgschance.", "Klage gegen EU-Lieferketten-Richtlinie eingereicht."),
        # eu_rl_klima
        ("eu_rl_klima", "sofort_umsetzen", 0, 0, 0, 0, 0, 0, 0.35, "Sofort umsetzen", "Kofinanzierung 35%. Vollständige Anpassung.", "EU-Klimaverschärfung umgesetzt."),
        ("eu_rl_klima", "minimal_umsetzen", 0, 0, 0, 0, 0, 0, 0.15, "Minimal umsetzen", "Minimale Anpassung, Wirkung -30%.", "EU-Klimaverschärfung minimal umgesetzt."),
        ("eu_rl_klima", "klagen", 0, 0, 0, 0, 0, 0, 0.0, "Klagen", "12 Monate Aufschub, 30% Erfolgschance.", "Klage gegen EU-Klimaverschärfung eingereicht."),
        # eu_rechtsruck
        ("eu_rechtsruck", "reagieren", 0, 0, 0, 0, 0, 0, 0.0, "Reagieren", "Koalitionspartner +5.", "Regierung reagiert auf Rechtsruck in Europa."),
        ("eu_rechtsruck", "neutral", 0, 0, 0, 0, 0, 0, 0.0, "Neutral", "Keine Stellungnahme.", "Regierung nimmt keine Position ein."),
        ("eu_rechtsruck", "gegenposition", 0, 0, 0, 0, 5, 0, 0.0, "Gegenposition", "EU-Klima +5 in 2 Feldern.", "Regierung bezieht Gegenposition zum Rechtsruck."),
        # eu_gipfel_frankreich
        ("eu_gipfel_frankreich", "thema_a", 0, 0, 0, 0, 0, 0, 0.0, "Thema A vorantreiben", "Priorität auf ein Verhandlungsthema.", "Deutsch-Französischer Gipfel: Thema A priorisiert."),
        ("eu_gipfel_frankreich", "thema_b", 0, 0, 0, 0, 0, 0, 0.0, "Thema B priorisieren", "Priorität auf anderes Verhandlungsthema.", "Deutsch-Französischer Gipfel: Thema B priorisiert."),
        ("eu_gipfel_frankreich", "beide_neutral", 0, 0, 0, 0, 0, 0, 0.0, "Beide neutral", "Keine klare Priorisierung.", "Deutsch-Französischer Gipfel ohne Durchbruch."),
        # europawahl
        ("europawahl", "zur_kenntnis", 0, 0, 0, 0, 0, 0, 0.0, "Ergebnis zur Kenntnis nehmen", "Kein Trade-off.", "Europawahl-Ergebnis zur Kenntnis genommen."),
    ]

    for event_id, ckey, cost, ea, eh, eg, ez, euk, kof, label, desc, log in choices_data:
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices (id, event_id, choice_key, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf, eu_klima_delta, kofinanzierung)
                VALUES (:id, :event_id, :choice_key, :cost, :ea, :eh, :eg, :ez, :euk, :kof)
            """),
            {"id": choice_id, "event_id": event_id, "choice_key": ckey, "cost": cost, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "euk": euk, "kof": kof},
        )
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label, "desc": desc, "log_msg": log},
        )
        choice_id += 1

    conn.execute(sa.text("SELECT setval('eu_event_choices_id_seq', :max_id)"), {"max_id": choice_id - 1})


def downgrade() -> None:
    """Remove 4 Haushalt-Gesetze und 6 EU-Events."""
    conn = op.get_bind()
    eu_event_ids = ["eu_rl_mindestlohn", "eu_rl_lieferkette", "eu_rl_klima", "eu_rechtsruck", "eu_gipfel_frankreich", "europawahl"]

    # EU-Event-Choices zuerst (FK auf eu_events)
    for eid in eu_event_ids:
        conn.execute(
            sa.text("""
                DELETE FROM eu_event_choices_i18n
                WHERE choice_id IN (SELECT id FROM eu_event_choices WHERE event_id = :eid)
            """),
            {"eid": eid},
        )
        conn.execute(sa.text("DELETE FROM eu_event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM eu_events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM eu_events WHERE id = :eid"), {"eid": eid})

    # Gesetze
    for gid in ["sondervermoegen_klima", "schuldenbremse_reform", "vermoegensteuer", "steuerreform_2"]:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})
