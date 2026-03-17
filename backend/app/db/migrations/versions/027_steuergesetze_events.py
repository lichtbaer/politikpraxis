"""SMA-309: 8 Steuergesetze, Haushalt-Balance, 3 Steuer-Events

Revision ID: 027_steuergesetze
Revises: 026_lobby_route_params
Create Date: 2026-03-17

- 6 neue Steuergesetze (est_entlastung, spitzensteuersatz, unternehmenssteuer_reform,
  co2_steuer, erbschaftssteuer, plattformsteuer)
- Update schuldenbremse_reform: investiv=True, min_complexity=3
- Pflichtausgaben-Basis: 240 (Frontend-Konstante)
- 3 neue Steuer-Events: steuerstreit_koalition, steuereinnahmen_einbruch, haushaltsstreit_opposition
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "027_steuergesetze"
down_revision: Union[str, Sequence[str], None] = "026_lobby_route_params"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """6 neue Steuergesetze, schuldenbremse_reform Update, min_complexity für gesetze, 3 Events."""
    conn = op.get_bind()

    # --- min_complexity für gesetze (optional, für schuldenbremse_reform) ---
    op.add_column(
        "gesetze",
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
    )

    # --- Update schuldenbremse_reform ---
    conn.execute(
        sa.text("""
            UPDATE gesetze SET investiv = TRUE, min_complexity = 3
            WHERE id = 'schuldenbremse_reform'
        """)
    )

    # --- 6 neue Steuergesetze ---
    # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, inv, min_complexity
    gesetze_data = [
        ("est_entlastung", ["bund"], 52, -0.2, 0, -0.1, 4, 4, False, -20, -30, -20, "wirtschaft_finanzen", 0.0, 0.0, -8.0, False, 1),
        ("spitzensteuersatz", ["bund"], 46, -0.1, 0, -0.2, 3, 4, False, -65, -10, -30, "wirtschaft_finanzen", 0.0, 0.0, 10.0, False, 1),
        ("unternehmenssteuer_reform", ["bund"], 54, -0.3, 0, 0.5, 2, 4, False, 70, 5, 50, "wirtschaft_finanzen", 0.0, 0.0, -12.0, False, 1),
        ("co2_steuer", ["bund", "eu"], 48, -0.2, 0, -0.3, 4, 4, False, -30, -60, -20, "umwelt_energie", 0.0, 0.0, 6.0, False, 1),
        ("erbschaftssteuer", ["bund"], 45, -0.1, 0, -0.2, 3, 4, False, -55, -15, -25, "wirtschaft_finanzen", 0.0, 0.0, 5.0, False, 1),
        ("plattformsteuer", ["bund", "eu"], 50, -0.1, 0, -0.2, 3, 4, False, -40, -20, -30, "digital_infrastruktur", 0.0, 0.0, 4.0, False, 1),
    ]

    for (
        gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, inv, minc
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, investiv, min_complexity)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    :ke, :kl, :einn, :inv, :minc)
            """),
            {
                "id": gid, "tags": tags_sql, "bt": bt, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "lag": lag,
                "foed": foed, "iw": iw, "ig": ig, "is_": is_, "pf": pf, "ke": ke, "kl": kl, "einn": einn,
                "inv": inv, "minc": minc,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        ("est_entlastung", "Einkommensteuer-Entlastungsgesetz", "ESt-EntlG",
         "Senkung der Einkommensteuer für untere und mittlere Einkommen."),
        ("spitzensteuersatz", "Spitzensteuersatz-Erhöhungsgesetz", "SpSt-ErhG",
         "Anhebung des Spitzensteuersatzes auf 52% ab 120.000 € Jahreseinkommen."),
        ("unternehmenssteuer_reform", "Unternehmenssteuer-Reformgesetz", "USR",
         "Senkung der Körperschaftsteuer von 15% auf 12% zur Stärkung des Standorts."),
        ("co2_steuer", "CO2-Steuer-Erhöhungsgesetz", "CO2-ErhG",
         "Anhebung der CO2-Bepreisung auf 80€/Tonne mit sozialem Ausgleich."),
        ("erbschaftssteuer", "Erbschaftssteuer-Reformgesetz", "ErbSt-Reform",
         "Verschärfung der Erbschaftssteuer bei großen Betriebsvermögen und Immobilien."),
        ("plattformsteuer", "Digitale Plattformsteuer", "PlattformSt",
         "Steuer auf Umsätze digitaler Plattformen und Tech-Konzerne in Deutschland."),
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
        ("est_entlastung", "Income Tax Relief Act", "ITRA",
         "Reduction of income tax for lower and middle incomes."),
        ("spitzensteuersatz", "Top Tax Rate Increase Act", "TTRA",
         "Raising the top tax rate to 52% for annual income over 120,000 €."),
        ("unternehmenssteuer_reform", "Corporate Tax Reform Act", "CTRA",
         "Reduction of corporate tax from 15% to 12% to strengthen the business location."),
        ("co2_steuer", "CO2 Tax Increase Act", "CO2IA",
         "Raising CO2 pricing to 80€/tonne with social compensation."),
        ("erbschaftssteuer", "Inheritance Tax Reform Act", "ITRA",
         "Tightening inheritance tax on large business assets and real estate."),
        ("plattformsteuer", "Digital Platform Tax", "DPT",
         "Tax on revenues of digital platforms and tech corporations in Germany."),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- 3 neue Steuer-Events (conditional) ---
    events_data = [
        ("steuerstreit_koalition", "conditional", None, 2),
        ("steuereinnahmen_einbruch", "conditional", None, 2),
        ("haushaltsstreit_opposition", "conditional", None, 2),
    ]

    for eid, etype, char_id, minc in events_data:
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, char_id, trigger_type, min_complexity)
                VALUES (:id, :etype, :char_id, 'conditional', :minc)
            """),
            {"id": eid, "etype": etype, "char_id": char_id, "minc": minc},
        )

    # --- events_i18n (DE) ---
    events_i18n_de = [
        ("steuerstreit_koalition", "Koalitionsstreit", "Koalitionsstreit über Steuerpolitik",
         "Das können wir nicht mittragen. Das widerspricht unserem Koalitionsvertrag.",
         "Koalitionspartner lehnen Steuergesetz ab."),
        ("steuereinnahmen_einbruch", "Steuereinbruch", "Steuereinnahmen brechen ein",
         "Die Konjunktur schwächelt — die Steuerschätzung wurde um 15 Mrd. nach unten revidiert.",
         "Steuereinnahmen-Einbruch — Haushalt unter Druck."),
        ("haushaltsstreit_opposition", "Haushaltskritik", "Opposition greift Haushaltspolitik an",
         "Diese Bundesregierung wirtschaftet Deutschland in den Ruin.",
         "Opposition attackiert Haushaltspolitik."),
    ]

    for eid, type_label, title, quote, ticker in events_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :type_label, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "type_label": type_label, "title": title, "quote": quote, "context": quote, "ticker": ticker},
        )

    # --- events_i18n (EN) ---
    events_i18n_en = [
        ("steuerstreit_koalition", "Coalition dispute", "Coalition dispute over tax policy",
         "We cannot support this. It contradicts our coalition agreement.",
         "Coalition partner rejects tax law."),
        ("steuereinnahmen_einbruch", "Tax revenue slump", "Tax revenues collapse",
         "The economy is weakening — tax estimates revised down by 15 bn.",
         "Tax revenue slump — budget under pressure."),
        ("haushaltsstreit_opposition", "Budget criticism", "Opposition attacks budget policy",
         "This federal government is ruining Germany's finances.",
         "Opposition attacks budget policy."),
    ]

    for eid, type_label, title, quote, ticker in events_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'en', :type_label, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "type_label": type_label, "title": title, "quote": quote, "context": quote, "ticker": ticker},
        )

    # --- event_choices: steuerstreit_koalition ---
    max_id_result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    choice_id = max_id_result.scalar() + 1
    choices_steuerstreit = [
        ("steuerstreit_koalition", "kompromiss", "primary", 15, 5, "Kompromiss aushandeln", "Koalitionspartner einbinden, KV gestärkt.", "Kompromiss gefunden.",
         "Negotiate compromise", "Include coalition partner, strengthen agreement.", "Compromise found."),
        ("steuerstreit_koalition", "ueberreden", "danger", 10, -8, "Partner überstimmen", "Beziehung belastet.", "Partner überstimmt.",
         "Override partner", "Relationship strained.", "Partner overridden."),
        ("steuerstreit_koalition", "zurueckziehen", "safe", 0, 0, "Gesetz zurückziehen", "Kein Konflikt.", "Gesetz zurückgezogen.",
         "Withdraw law", "No conflict.", "Law withdrawn."),
    ]
    for event_id, ckey, ctype, cost, kp_delta, label_de, desc_de, log_de, label_en, desc_en, log_en in choices_steuerstreit:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, koalitionspartner_beziehung_delta)
                VALUES (:id, :event_id, :ckey, :ctype, :cost, :kp_delta)
            """),
            {"id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost, "kp_delta": kp_delta},
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

    # --- event_choices: steuereinnahmen_einbruch ---
    # Trigger applies einnahmen -15. Choices: sparen (effekt_hh +8), schulden (-15), steuer (+8)
    choices_steuereinbruch = [
        ("steuereinnahmen_einbruch", "sparen", "primary", 0, 8.0, "Ausgaben kürzen", "Haushalt entlasten.", "Ausgaben gekürzt.",
         "Cut spending", "Relieve budget.", "Spending cut."),
        ("steuereinnahmen_einbruch", "schulden", "danger", 0, -15.0, "Defizit hinnehmen", "Saldo verschlechtert sich.", "Defizit hingenommen.",
         "Accept deficit", "Balance worsens.", "Deficit accepted."),
        ("steuereinnahmen_einbruch", "steuer", "safe", 20, 8.0, "Steuererhöhung", "Einnahmen steigen, Zustimmung sinkt.", "Steuererhöhung beschlossen.",
         "Raise taxes", "Revenue rises, approval drops.", "Tax increase passed."),
    ]
    for event_id, ckey, ctype, cost, eff_hh, label_de, desc_de, log_de, label_en, desc_en, log_en in choices_steuereinbruch:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_hh)
                VALUES (:id, :event_id, :ckey, :ctype, :cost, :eff_hh)
            """),
            {"id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost, "eff_hh": eff_hh},
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

    # --- event_choices: haushaltsstreit_opposition ---
    choices_haushalt = [
        ("haushaltsstreit_opposition", "kontern", "primary", 10, 3, "Öffentlich kontern", "Medienklima verbessert.", "Öffentlich kontert.",
         "Counter publicly", "Media climate improves.", "Publicly countered."),
        ("haushaltsstreit_opposition", "ignorieren", "safe", 0, 0, "Ignorieren", "Keine Reaktion.", "Ignoriert.",
         "Ignore", "No response.", "Ignored."),
    ]
    for event_id, ckey, ctype, cost, medien_delta, label_de, desc_de, log_de, label_en, desc_en, log_en in choices_haushalt:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, medienklima_delta)
                VALUES (:id, :event_id, :ckey, :ctype, :cost, :medien_delta)
            """),
            {"id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost, "medien_delta": medien_delta},
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
    """Remove 6 Gesetze, 3 Events, revert schuldenbremse_reform, drop min_complexity."""
    conn = op.get_bind()

    # Event choices + events
    for eid in ["steuerstreit_koalition", "steuereinnahmen_einbruch", "haushaltsstreit_opposition"]:
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
    for gid in ["est_entlastung", "spitzensteuersatz", "unternehmenssteuer_reform", "co2_steuer", "erbschaftssteuer", "plattformsteuer"]:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})

    conn.execute(
        sa.text("UPDATE gesetze SET investiv = FALSE, min_complexity = 1 WHERE id = 'schuldenbremse_reform'")
    )

    op.drop_column("gesetze", "min_complexity")
