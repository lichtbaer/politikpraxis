"""SMA-394: Dynamische Events — Trigger-Felder + Seed (Wirtschaft, Koalition, international, Gesellschaft).

Revision ID: 044_sma394_dynamic_events
Revises: 043_medien_akteure_sma390
Create Date: 2026-03-26
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "044_sma394_dynamic_events"
down_revision: Union[str, Sequence[str], None] = "043_medien_akteure_sma390"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("trigger_typ", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("trigger_params", JSONB(), nullable=True))
    op.add_column(
        "events",
        sa.Column(
            "einmalig", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
    )

    conn = op.get_bind()

    events_rows: list[dict[str, Any]] = [
        {
            "id": "dyn_wirtschaftskrise_droht",
            "event_type": "dynamic",
            "trigger_typ": "saldo_unter",
            "trigger_params": {"wert": -35, "monate": 3},
            "min_complexity": 2,
        },
        {
            "id": "dyn_rezession_eintritt",
            "event_type": "dynamic",
            "trigger_typ": "konjunktur_unter",
            "trigger_params": {"wert": -2},
            "min_complexity": 2,
        },
        {
            "id": "dyn_boom_steuermehreinnahmen",
            "event_type": "dynamic",
            "trigger_typ": "konjunktur_ueber_monate",
            "trigger_params": {"wert": 2, "monate": 6},
            "min_complexity": 2,
        },
        {
            "id": "dyn_koalitionskrise_gipfel",
            "event_type": "dynamic",
            "trigger_typ": "koalition_unter",
            "trigger_params": {"wert": 30},
            "min_complexity": 2,
        },
        {
            "id": "dyn_minister_ruecktritt_angebot",
            "event_type": "dynamic",
            "trigger_typ": "partner_minister_ablehnungen",
            "trigger_params": {"anzahl": 3},
            "min_complexity": 2,
        },
        {
            "id": "dyn_energiekrise_eu",
            "event_type": "dynamic",
            "trigger_typ": "monat_range",
            "trigger_params": {"von": 6, "bis": 30, "wahrscheinlichkeit": 0.12},
            "min_complexity": 1,
        },
        {
            "id": "dyn_fluechtlingswelle",
            "event_type": "dynamic",
            "trigger_typ": "monat_range",
            "trigger_params": {"von": 3, "bis": 40, "wahrscheinlichkeit": 0.1},
            "min_complexity": 1,
        },
        {
            "id": "dyn_naturkatastrophe_inland",
            "event_type": "dynamic",
            "trigger_typ": "monat_range",
            "trigger_params": {"von": 1, "bis": 48, "wahrscheinlichkeit": 0.08},
            "min_complexity": 1,
        },
        {
            "id": "dyn_vertrauenskrise_umfrage",
            "event_type": "dynamic",
            "trigger_typ": "medienklima_unter_monate",
            "trigger_params": {"wert": 25, "monate": 4},
            "min_complexity": 2,
        },
        {
            "id": "dyn_desinformation_kampagne",
            "event_type": "dynamic",
            "trigger_typ": "medienakteur_reichweite",
            "trigger_params": {"akteur": "alternativ", "ueber": 12},
            "min_complexity": 4,
        },
    ]

    for row in events_rows:
        conn.execute(
            sa.text("""
                INSERT INTO events (
                    id, event_type, trigger_typ, trigger_params, einmalig, min_complexity
                ) VALUES (
                    :id, :event_type, :trigger_typ, CAST(:trigger_params AS jsonb),
                    true, :min_complexity
                )
                ON CONFLICT (id) DO UPDATE SET
                    event_type = EXCLUDED.event_type,
                    trigger_typ = EXCLUDED.trigger_typ,
                    trigger_params = EXCLUDED.trigger_params,
                    einmalig = EXCLUDED.einmalig,
                    min_complexity = EXCLUDED.min_complexity
            """),
            {
                "id": row["id"],
                "event_type": row["event_type"],
                "trigger_typ": row["trigger_typ"],
                "trigger_params": json.dumps(row["trigger_params"]),
                "min_complexity": row["min_complexity"],
            },
        )

    events_i18n_de = [
        (
            "dyn_wirtschaftskrise_droht",
            "Wirtschaft",
            "Ratingagentur senkt Kreditwürdigkeit",
            "Die internationale Ratingagentur hat die Bonität Deutschlands herabgestuft.",
            "Die Zinsen für Staatsanleihen steigen. Finanzmärkte und Medien reagieren nervös.",
            "Rating-Downgrade: höhere Zinslast",
        ),
        (
            "dyn_rezession_eintritt",
            "Wirtschaft",
            "Deutschland rutscht in Rezession",
            "Konjunkturdaten bestätigen zwei Quartale negatives Wachstum.",
            "Steuereinnahmen brechen ein, die Arbeitslosigkeit steigt. Die Opposition fordert ein Konjunkturprogramm.",
            "Rezession: Steuern und Jobs unter Druck",
        ),
        (
            "dyn_boom_steuermehreinnahmen",
            "Wirtschaft",
            "Steuermehreinnahmen: Überschuss",
            "Die Konjunktur läuft heiß — der Fiskus sprudelt.",
            "Das Finanzministerium meldet unerwartet hohe Mehreinnahmen. Streit über die Verwendung entbrennt.",
            "Konjunkturboom: Mehreinnahmen",
        ),
        (
            "dyn_koalitionskrise_gipfel",
            "Koalition",
            "Koalitionsgipfel: Koalition steht auf der Kippe",
            "Die Differenzen sind zu groß geworden.",
            "Der Koalitionspartner fordert ein Krisentreffen. Ohne Kompromiss droht langfristige Instabilität.",
            "Koalitionskrise: Krisengipfel",
        ),
        (
            "dyn_minister_ruecktritt_angebot",
            "Koalition",
            "Rücktrittsangebot aus dem Kabinett",
            "Nach wiederholten Konflikten deutet ein Minister Rückzug an.",
            "Der Koalitionspartner beobachtet genau, wie Sie reagieren.",
            "Kabinett: Rücktritt angeboten",
        ),
        (
            "dyn_energiekrise_eu",
            "International",
            "EU-Energiekrise: Gaspreise explodieren",
            "Die Märkte drehen durch — Haushalt und Konjunktur leiden.",
            "Brüssel koordiniert, aber die Last trifft die Mitgliedstaaten. Hilfen oder Markt — Sie entscheiden.",
            "Energiekrise belastet Deutschland",
        ),
        (
            "dyn_fluechtlingswelle",
            "International",
            "Humanitäre Krise an der EU-Außengrenze",
            "Hunderttausende suchen Schutz — der Druck auf Bund und Länder wächst.",
            "Medien und Bundesrat fordern klare Linien. Europa erwartet deutsche Führung.",
            "Fluchtbewegung: EU unter Druck",
        ),
        (
            "dyn_naturkatastrophe_inland",
            "Katastrophe",
            "Schwere Unwetter: mehrere Länder im Ausnahmezustand",
            "Soforthilfe bindet Milliarden — die Schuldenbremse wird zur Debatte.",
            "Katastrophenschutz und Wiederaufbau konkurrieren mit dem Haushaltsjahr.",
            "Unwetter: Ausnahmezustand in Regionen",
        ),
        (
            "dyn_vertrauenskrise_umfrage",
            "Gesellschaft",
            "Umfrage: Regierungsvertrauen am Boden",
            "Nur noch ein Bruchteil der Befragten vertraut der Regierung.",
            "PK-Regeneration leidet, die Wahlprognose sackt ab. Eine Geste der Erneuerung könnte helfen.",
            "Vertrauenskrise in der Öffentlichkeit",
        ),
        (
            "dyn_desinformation_kampagne",
            "Gesellschaft",
            "Koordinierte Desinformation erschüttert Debatte",
            "Alternative Kanäle verbreiten gezielt Narrative.",
            "Das Medienklima kippt. Eine Initiative kostet Politik-Kapital, Schweigen verschärft den Schaden.",
            "Desinformation: öffentliche Debatte polarisiert",
        ),
    ]

    for eid, tl, title, quote, context, ticker in events_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
                ON CONFLICT (event_id, locale) DO UPDATE SET
                    type_label = EXCLUDED.type_label,
                    title = EXCLUDED.title,
                    quote = EXCLUDED.quote,
                    context = EXCLUDED.context,
                    ticker = EXCLUDED.ticker
            """),
            {
                "eid": eid,
                "tl": tl,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    conn.execute(
        sa.text("""
            DELETE FROM event_choices_i18n WHERE choice_id IN (
                SELECT id FROM event_choices WHERE event_id LIKE 'dyn_%'
            )
        """)
    )
    conn.execute(sa.text("DELETE FROM event_choices WHERE event_id LIKE 'dyn_%'"))

    def ch(
        eid: str,
        key: str,
        ctype: str,
        cost: int,
        eff: dict[str, float],
        label: str,
        desc: str,
        log: str,
        kpd: int | None = None,
        mk: int | None = None,
    ) -> tuple[
        str, str, str, int, dict[str, float], str, str, str, int | None, int | None
    ]:
        return (eid, key, ctype, cost, eff, label, desc, log, kpd, mk)

    choice_rows: list[
        tuple[
            str, str, str, int, dict[str, float], str, str, str, int | None, int | None
        ]
    ] = [
        ch(
            "dyn_wirtschaftskrise_droht",
            "sparpaket",
            "primary",
            12,
            {"hh": 0.25, "zf": -4},
            "Sparpaket ankündigen",
            "Konsolidierung — beliebt bei Märkten, Zustimmung leidet.",
            "Sparpaket angekündigt. Haushalt entlastet, Zustimmung sinkt.",
            None,
            None,
        ),
        ch(
            "dyn_wirtschaftskrise_droht",
            "investieren",
            "danger",
            8,
            {"hh": -0.35, "gi": 0.4},
            "Gegeninvestitionsprogramm",
            "Teuer, aber Konjunkturimpuls.",
            "Investitionsprogramm beschlossen. Schulden steigen, Wirtschaft stabilisiert sich.",
            -8,
            -6,
        ),
        ch(
            "dyn_wirtschaftskrise_droht",
            "ignorieren",
            "safe",
            0,
            {},
            "Abwarten",
            "Kein sofortiger PK-Einsatz — Medien werden kritischer.",
            "Regierung wartet ab. Medien üben scharfe Kritik.",
            None,
            -5,
        ),
        ch(
            "dyn_rezession_eintritt",
            "konjunkturpaket",
            "primary",
            15,
            {"hh": -0.4, "al": 0.35},
            "Konjunkturpaket",
            "Defizitfinanzierung zur Stützung — belastet Haushalt.",
            "Konjunkturpaket aufgelegt. Kurzfristige Kosten, wirtschaftliche Stützung.",
            -6,
            3,
        ),
        ch(
            "dyn_rezession_eintritt",
            "struktur",
            "safe",
            10,
            {"zf": 2},
            "Strukturreformen kommunizieren",
            "Langfristiger Kurs, wenig sofortige Wirkung auf Konjunktur.",
            "Reformagenda kommuniziert. Vertrauen leicht gestärkt.",
            5,
            None,
        ),
        ch(
            "dyn_rezession_eintritt",
            "sparen",
            "danger",
            5,
            {"zf": -5, "hh": 0.15},
            "Sparen priorisieren",
            "Haushalt straffen — riskant in der Rezession.",
            "Sparkurs. Märkte beruhigt, Wirtschaft und Zustimmung leiden.",
            None,
            -4,
        ),
        ch(
            "dyn_boom_steuermehreinnahmen",
            "schulden_tilgen",
            "safe",
            5,
            {"hh": 0.3},
            "Schulden tilgen",
            "Vorsichtiger Kurs — solide Finanzen.",
            "Überschuss für Schuldentilgung eingesetzt.",
            8,
            None,
        ),
        ch(
            "dyn_boom_steuermehreinnahmen",
            "investieren",
            "primary",
            8,
            {"hh": -0.25, "gi": 0.3},
            "Investitionsprogramm",
            "Zukunftsinvestitionen — weniger Puffer.",
            "Investitionsoffensive beschlossen.",
            5,
            2,
        ),
        ch(
            "dyn_boom_steuermehreinnahmen",
            "steuern_senken",
            "danger",
            12,
            {"hh": -0.2, "zf": 5},
            "Steuern senken",
            "Popularität steigt, dauerhaft weniger Spielraum.",
            "Steuersenkung angekündigt. Wählerfreundlich, fiskalisch riskant.",
            -10,
            4,
        ),
        ch(
            "dyn_koalitionskrise_gipfel",
            "zugestaendnis",
            "primary",
            15,
            {},
            "Zugeständnis machen",
            "Teure Einigung — Koalition stabilisiert sich.",
            "Zugeständnis an den Partner. Koalition beruhigt, PK belastet.",
            20,
            None,
        ),
        ch(
            "dyn_koalitionskrise_gipfel",
            "auf_zeit",
            "danger",
            5,
            {},
            "Auf Zeit spielen",
            "Kurz kein hoher PK-Verlust — Partner kühlt ab.",
            "Verzögerungstaktik. Koalitionspartner verärgert.",
            -10,
            -3,
        ),
        ch(
            "dyn_koalitionskrise_gipfel",
            "umbildung",
            "safe",
            20,
            {},
            "Kabinettsumbildung anbieten",
            "Signal des Neuanstarts — hoher PK-Preis.",
            "Umbildung angeboten. Koalition gestärkt, Kabinett erschüttert.",
            15,
            None,
        ),
        ch(
            "dyn_minister_ruecktritt_angebot",
            "annehmen",
            "primary",
            0,
            {},
            "Rücktritt annehmen",
            "Sauberer Schnitt — Koalition bleibt intakt.",
            "Rücktritt akzeptiert. Kabinett umbesetzt, Partner zufrieden.",
            12,
            2,
        ),
        ch(
            "dyn_minister_ruecktritt_angebot",
            "ablehnen",
            "danger",
            10,
            {},
            "Ablehnen und verteidigen",
            "Persönliche Loyalität — Partner sieht Affront.",
            "Rücktritt abgelehnt. Koalitionspartner verstimmt.",
            -15,
            -4,
        ),
        ch(
            "dyn_minister_ruecktritt_angebot",
            "kompromiss",
            "safe",
            12,
            {},
            "Kompromiss aushandeln",
            "Teure Einigung ohne Personalwechsel.",
            "Kompromiss gefunden. Kabinett bleibt, Koalition gemäßigt.",
            5,
            None,
        ),
        ch(
            "dyn_energiekrise_eu",
            "energiehilfen",
            "primary",
            12,
            {"hh": -0.45, "gi": -0.25},
            "Energiehilfen ausweiten",
            "Teuer, aber soziale Entlastung.",
            "Energiehilfen beschlossen. Haushalt belastet, Bevölkerung entlastet.",
            5,
            3,
        ),
        ch(
            "dyn_energiekrise_eu",
            "markt",
            "danger",
            5,
            {"gi": -0.35},
            "Markt regeln lassen",
            "Weniger Ausgaben — Wirtschaft und Medien leiden.",
            "Marktorientierter Kurs. Konjunktur unter Druck, Medien kritisch.",
            None,
            -8,
        ),
        ch(
            "dyn_energiekrise_eu",
            "eu_koordination",
            "safe",
            8,
            {},
            "EU-Koordination suchen",
            "Diplomatischer Weg — gemischte Bilanz.",
            "EU-Koordinierung intensiviert. Spielraum bleibt begrenzt.",
            8,
            None,
        ),
        ch(
            "dyn_fluechtlingswelle",
            "aufnahme",
            "primary",
            15,
            {"hh": -0.3},
            "Aufnahmeprogramm",
            "Humanitär — konservative Milieus kritisieren.",
            "Aufnahmeprogramm gestartet. Haushalt belastet, progressive Milieus unterstützen.",
            6,
            -3,
        ),
        ch(
            "dyn_fluechtlingswelle",
            "eu_loesung",
            "safe",
            10,
            {},
            "EU-Lösung fordern",
            "Weniger nationale Last — langsamer Effekt.",
            "EU-Lösung eingefordert. Partner in Brüssel zustimmend.",
            5,
            None,
        ),
        ch(
            "dyn_fluechtlingswelle",
            "restriktiv",
            "danger",
            8,
            {"zf": -3},
            "Restriktivere Linie",
            "Polarisierung zwischen Milieus.",
            "Restriktivere Maßnahmen angekündigt. Polarisierung nimmt zu.",
            -8,
            -5,
        ),
        ch(
            "dyn_naturkatastrophe_inland",
            "notlage",
            "primary",
            10,
            {"hh": -0.35},
            "Notlage nutzen",
            "Mehr fiskalischer Spielraum — rechtlich sensibel.",
            "Notlageninstrumente aktiviert. Hilfen fließen schneller.",
            -5,
            2,
        ),
        ch(
            "dyn_naturkatastrophe_inland",
            "regulaer",
            "safe",
            5,
            {"hh": -0.25},
            "Reguläre Mittel",
            "Engerer Rahmen, weniger Kontroverse.",
            "Hilfen aus regulärem Haushalt. Langsamer, aber kontroversarm.",
            3,
            None,
        ),
        ch(
            "dyn_naturkatastrophe_inland",
            "bund_laender",
            "danger",
            12,
            {},
            "Bund-Länder-Sonderprogramm",
            "Länder einbinden — Bundesrat stärker im Spiel.",
            "Sonderprogramm mit Ländern. Bundesrat stärker eingebunden.",
            None,
            None,
        ),
        ch(
            "dyn_vertrauenskrise_umfrage",
            "erneuerung",
            "primary",
            18,
            {"zf": 4},
            "Erneuerungskurs starten",
            "Teuer, aber Wähler hören zu.",
            "Erneuerungsinitiative gestartet. Vertrauen kehrt langsam zurück.",
            8,
            4,
        ),
        ch(
            "dyn_vertrauenskrise_umfrage",
            "kommunikation",
            "safe",
            10,
            {"zf": 2},
            "Kommunikationsoffensive",
            "Mittlerer Effekt, moderater PK-Einsatz.",
            "Kommunikationsoffensive. Leichte Besserung im Medienklima.",
            4,
            2,
        ),
        ch(
            "dyn_vertrauenskrise_umfrage",
            "business_as_usual",
            "danger",
            0,
            {},
            "Weitermachen wie bisher",
            "Kein PK-Verlust — Vertrauen bleibt schwach.",
            "Keine sichtbare Reaktion. Umfragen bleiben schlecht.",
            None,
            -3,
        ),
        ch(
            "dyn_desinformation_kampagne",
            "medienkompetenz",
            "primary",
            15,
            {},
            "Medienkompetenz-Initiative",
            "Langfristig sinnvoll — kurz polarisierend.",
            "Initiative zu Medienkompetenz gestartet.",
            -5,
            3,
        ),
        ch(
            "dyn_desinformation_kampagne",
            "plattformregulierung",
            "danger",
            12,
            {"zf": -2},
            "Schärfere Aufsicht fordern",
            "Rechtsstaatlich — riskant für liberale Milieus.",
            "Verschärfte Aufsicht angekündigt. Debatte verhärtet.",
            -8,
            -4,
        ),
        ch(
            "dyn_desinformation_kampagne",
            "ignorieren",
            "safe",
            0,
            {},
            "Nicht öffentlich reagieren",
            "Kein PK-Verlust — Narrative gewinnen Terrain.",
            "Schweigen der Regierung. Alternative Kanäle dominieren.",
            None,
            -6,
        ),
    ]

    for eid, key, ctype, cost, eff, label, desc, log, kpd, mk in choice_rows:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (
                    event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    koalitionspartner_beziehung_delta, medienklima_delta
                ) VALUES (
                    :eid, :key, :ctype, :cost,
                    :al, :hh, :gi, :zf,
                    :kpd, :mk
                )
            """),
            {
                "eid": eid,
                "key": key,
                "ctype": ctype,
                "cost": cost,
                "al": eff.get("al", 0),
                "hh": eff.get("hh", 0),
                "gi": eff.get("gi", 0),
                "zf": eff.get("zf", 0),
                "kpd": kpd,
                "mk": mk,
            },
        )
        r2 = conn.execute(
            sa.text(
                "SELECT id FROM event_choices WHERE event_id = :eid AND choice_key = :key ORDER BY id DESC LIMIT 1"
            ),
            {"eid": eid, "key": key},
        )
        cid = r2.scalar_one()
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:cid, 'de', :label, :desc, :log)
            """),
            {"cid": cid, "label": label, "desc": desc, "log": log},
        )


def downgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM event_choices_i18n WHERE choice_id IN (
                SELECT id FROM event_choices WHERE event_id LIKE 'dyn_%'
            )
        """)
    )
    op.execute(sa.text("DELETE FROM event_choices WHERE event_id LIKE 'dyn_%'"))
    op.execute(sa.text("DELETE FROM events_i18n WHERE event_id LIKE 'dyn_%'"))
    op.execute(sa.text("DELETE FROM events WHERE id LIKE 'dyn_%'"))
    op.drop_column("events", "einmalig")
    op.drop_column("events", "trigger_params")
    op.drop_column("events", "trigger_typ")
