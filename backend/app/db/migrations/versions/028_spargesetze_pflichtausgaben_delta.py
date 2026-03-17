"""SMA-310: pflichtausgaben_delta, 5 Spargesetze, Lehmann-Startmemo, Haushaltskrise-Event

Revision ID: 028_spargesetze
Revises: 027_steuergesetze
Create Date: 2026-03-17

- pflichtausgaben_delta Spalte in gesetze
- 5 neue Sparmaßnahmen-Gesetze
- lehmann_defizit_start Event (Monat 1)
- haushaltskrise Event (Saldo < -30)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "028_spargesetze"
down_revision: Union[str, Sequence[str], None] = "027_steuergesetze"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pflichtausgaben_delta, 5 Spargesetze, lehmann_defizit_start, haushaltskrise."""
    conn = op.get_bind()

    # --- pflichtausgaben_delta in gesetze ---
    op.add_column(
        "gesetze",
        sa.Column("pflichtausgaben_delta", sa.Numeric(8, 2), nullable=True, server_default="0"),
    )

    # --- 5 neue Sparmaßnahmen-Gesetze ---
    # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, pfl_delta, inv, minc
    gesetze_data = [
        ("sozialleistungen_kuerzen", ["bund"], 48, -0.1, 0, -0.1, 2, 4, False, 40, 30, 30, "arbeit_soziales", 0.0, 0.0, 5.0, -5.0, False, 1),
        ("beamtenbesoldung_einfrieren", ["bund"], 52, 0, 0, 0, 1, 4, False, 20, 10, 20, "wirtschaft_finanzen", 0.0, 0.0, 0.0, -3.0, False, 1),
        ("subventionen_abbau", ["bund"], 46, -0.1, 0, -0.2, 3, 4, False, -10, -30, -10, "wirtschaft_finanzen", 0.0, 0.0, 4.0, 0.0, False, 1),
        ("rente_stabilisierung", ["bund"], 44, -0.2, 0, -0.1, 2, 4, False, 30, 20, 10, "arbeit_soziales", 0.0, 0.0, 0.0, -8.0, False, 1),
        ("effizienzprogramm_bund", ["bund"], 54, 0, 0, 0.2, 2, 4, False, 10, 0, 20, "digital_infrastruktur", -2.0, 0.0, 0.0, -4.0, True, 1),
    ]

    for (
        gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, pfl_delta, inv, minc
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, pflichtausgaben_delta,
                    investiv, min_complexity)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    :ke, :kl, :einn, :pfl_delta, :inv, :minc)
            """),
            {
                "id": gid, "tags": tags_sql, "bt": bt, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "lag": lag,
                "foed": foed, "iw": iw, "ig": ig, "is_": is_, "pf": pf, "ke": ke, "kl": kl, "einn": einn,
                "pfl_delta": pfl_delta, "inv": inv, "minc": minc,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        ("sozialleistungen_kuerzen", "Sozialleistungs-Konsolidierungsgesetz", "SozKonsG",
         "Kürzung von Sozialleistungen und Streichung von Subventionen zur Haushaltskonsolidierung."),
        ("beamtenbesoldung_einfrieren", "Besoldungsmoratorium", "BesoldMor",
         "Einfrierung der Beamtenbesoldung für 2 Jahre zur Haushaltsentlastung."),
        ("subventionen_abbau", "Subventionsabbau-Gesetz", "SubvAbbG",
         "Streichung klimaschädlicher Subventionen und Steuerbefreiungen."),
        ("rente_stabilisierung", "Rentenstabilisierungsgesetz", "RentStabG",
         "Anhebung des Renteneintrittsalters auf 68 Jahre und Anpassung der Rentenformel."),
        ("effizienzprogramm_bund", "Bundeseffizienzprogramm", "BundEffProg",
         "Digitalisierung und Verschlankung der Bundesverwaltung — weniger Bürokratie, weniger Kosten."),
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
        ("sozialleistungen_kuerzen", "Social Benefits Consolidation Act", "SBCA",
         "Cutting social benefits and subsidies for budget consolidation."),
        ("beamtenbesoldung_einfrieren", "Civil Service Pay Freeze", "CSPF",
         "Freezing civil service pay for 2 years to relieve the budget."),
        ("subventionen_abbau", "Subsidy Reduction Act", "SRA",
         "Eliminating climate-harmful subsidies and tax exemptions."),
        ("rente_stabilisierung", "Pension Stabilization Act", "PSA",
         "Raising retirement age to 68 and adjusting the pension formula."),
        ("effizienzprogramm_bund", "Federal Efficiency Program", "FEP",
         "Digitalization and streamlining of federal administration — less bureaucracy, lower costs."),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- lehmann_defizit_start Event (char_ultimatum, Monat 1) ---
    conn.execute(
        sa.text("""
            INSERT INTO events (id, event_type, char_id, trigger_type, trigger_month, min_complexity)
            VALUES ('lehmann_defizit_start', 'char_ultimatum', 'fm', 'fix', 1, 2)
        """)
    )

    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES ('lehmann_defizit_start', 'de', 'Haushaltslage', 'Lehmann: Haushaltslage kritisch',
                'Ich muss Sie gleich zu Beginn informieren: Wir erben ein strukturelles Defizit von 20 Mrd. Euro. Ohne Gegenmaßnahmen wird die Schuldenbremse bis Monat 8 verletzt.',
                'Die neue Regierung übernimmt einen Haushalt unter Druck. Handlungsbedarf besteht sofort.',
                'Lehmann warnt vor strukturellem Defizit')
        """)
    )

    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES ('lehmann_defizit_start', 'en', 'Budget situation', 'Lehmann: Budget situation critical',
                'I must inform you at the outset: We inherit a structural deficit of 20 billion euros. Without countermeasures, the debt brake will be violated by month 8.',
                'The new government takes over a budget under pressure. Action is needed immediately.',
                'Lehmann warns of structural deficit')
        """)
    )

    # --- event_choices: lehmann_defizit_start ---
    max_id_result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    choice_id = max_id_result.scalar() + 1
    choices_lehmann = [
        ("lehmann_defizit_start", "konsolidieren", "primary", 0, "Konsolidierungskurs einschlagen", "Haushalt sanieren.", "Konsolidierungskurs eingeschlagen.",
         "Pursue consolidation", "Stabilize budget.", "Consolidation course set."),
        ("lehmann_defizit_start", "investieren", "danger", 0, "Trotzdem in Wachstum investieren", "Risiko für Schuldenbremse.", "Investitionskurs gewählt.",
         "Invest in growth anyway", "Risk to debt brake.", "Investment course chosen."),
        ("lehmann_defizit_start", "abwarten", "safe", 0, "Erstmal abwarten und analysieren", "Zeit gewinnen.", "Abwarten beschlossen.",
         "Wait and analyze first", "Gain time.", "Wait and see decided."),
    ]
    for event_id, ckey, ctype, cost, label_de, desc_de, log_de, label_en, desc_en, log_en in choices_lehmann:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk)
                VALUES (:id, :event_id, :ckey, :ctype, :cost)
            """),
            {"id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log)
            """),
            {"id": choice_id, "label": label_de, "desc": desc_de, "log": log_de},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log)
            """),
            {"id": choice_id, "label": label_en, "desc": desc_en, "log": log_en},
        )
        choice_id += 1

    # --- haushaltskrise Event (Saldo < -30) ---
    conn.execute(
        sa.text("""
            INSERT INTO events (id, event_type, char_id, trigger_type, min_complexity)
            VALUES ('haushaltskrise', 'char_ultimatum', 'fm', 'conditional', 2)
        """)
    )

    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES ('haushaltskrise', 'de', 'Haushaltskrise', 'Haushaltskrise — Lehmann fordert Sofortmaßnahmen',
                'Bei einem Defizit von über 30 Mrd. Euro ist die Handlungsfähigkeit der Regierung gefährdet. Sofortmaßnahmen sind unausweichlich.',
                'Das strukturelle Defizit ist eskaliert. Der Finanzminister verlangt drastische Schritte.',
                'Haushaltskrise — Sofortmaßnahmen gefordert')
        """)
    )

    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES ('haushaltskrise', 'en', 'Budget crisis', 'Budget crisis — Lehmann demands immediate action',
                'With a deficit of over 30 billion euros, the government''s ability to act is at risk. Immediate measures are unavoidable.',
                'The structural deficit has escalated. The finance minister demands drastic steps.',
                'Budget crisis — immediate action demanded')
        """)
    )

    choices_haushaltskrise = [
        ("haushaltskrise", "sparpaket", "primary", 15, "Sofort-Sparpaket", "Pflichtausgaben kürzen.", "Sofort-Sparpaket beschlossen.",
         "Immediate austerity package", "Cut mandatory spending.", "Immediate austerity package passed."),
        ("haushaltskrise", "steuer_erhoehung", "danger", 0, "Steuererhöhung", "Einnahmen steigen, Zustimmung sinkt.", "Steuererhöhung beschlossen.",
         "Raise taxes", "Revenue rises, approval drops.", "Tax increase passed."),
        ("haushaltskrise", "schuldenbremse_aussetzen", "danger", 0, "Schuldenbremse aussetzen", "Lehmann-Ultimatum droht.", "Schuldenbremse ausgesetzt.",
         "Suspend debt brake", "Lehmann ultimatum looms.", "Debt brake suspended."),
    ]
    for event_id, ckey, ctype, cost, label_de, desc_de, log_de, label_en, desc_en, log_en in choices_haushaltskrise:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk)
                VALUES (:id, :event_id, :ckey, :ctype, :cost)
            """),
            {"id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log)
            """),
            {"id": choice_id, "label": label_de, "desc": desc_de, "log": log_de},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log)
            """),
            {"id": choice_id, "label": label_en, "desc": desc_en, "log": log_en},
        )
        choice_id += 1

    conn.execute(sa.text("SELECT setval('event_choices_id_seq', :max_id)"), {"max_id": choice_id - 1})


def downgrade() -> None:
    """Remove pflichtausgaben_delta, 5 Spargesetze, lehmann_defizit_start, haushaltskrise."""
    conn = op.get_bind()

    # Event choices + events
    for eid in ["lehmann_defizit_start", "haushaltskrise"]:
        conn.execute(
            sa.text("""
                DELETE FROM event_choices_i18n
                WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)
            """),
            {"eid": eid},
        )
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    # Gesetze
    for gid in ["sozialleistungen_kuerzen", "beamtenbesoldung_einfrieren", "subventionen_abbau", "rente_stabilisierung", "effizienzprogramm_bund"]:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})

    op.drop_column("gesetze", "pflichtausgaben_delta")
