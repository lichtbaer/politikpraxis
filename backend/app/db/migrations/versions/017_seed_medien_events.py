"""Seed 9 Medien-Events mit Choices (SMA-276)

Revision ID: 017_seed_medien_events
Revises: 016_wahlkampf_aktionen
Create Date: 2025-03-17

Migration 4: 9 Medien-Events (6 Skandale, 3 positive) mit je 2–3 Choices, DE-Texte.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "017_seed_medien_events"
down_revision: Union[str, Sequence[str], None] = "016_wahlkampf_aktionen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed 9 Medien-Events mit Choices (DE)."""
    conn = op.get_bind()

    # --- medien_events: 6 Skandale + 3 positive ---
    # id, event_subtype, trigger_type, medienklima_delta, min_complexity, trigger_monat_min, cooldown_months
    events_data = [
        ("medien_skandal_spesen", "skandal", "random", -8, 2, 1, 4),
        ("medien_skandal_datenpanne", "skandal", "random", -10, 2, 1, 4),
        ("medien_skandal_lobbying", "skandal", "random", -6, 2, 1, 4),
        ("medien_skandal_koalitionsleck", "skandal", "conditional", -12, 3, 6, 6),
        ("medien_skandal_haushaltsloch", "skandal", "conditional", -12, 3, 12, 6),
        ("medien_skandal_persoenlich", "skandal", "random", -7, 2, 1, 4),
        ("medien_positiv_intl_lob", "positiv", "random", 6, 2, 1, 4),
        ("medien_positiv_opp_fehler", "positiv", "conditional", 5, 2, 6, 4),
        ("medien_positiv_buerger_lob", "positiv", "random", 4, 1, 1, 3),
    ]

    for eid, subtype, trigger, delta, mc, tmin, cooldown in events_data:
        conn.execute(
            sa.text("""
                INSERT INTO medien_events (id, event_subtype, trigger_type, medienklima_delta, min_complexity, trigger_monat_min, cooldown_months)
                VALUES (:id, :subtype, :trigger, :delta, :mc, :tmin, :cooldown)
            """),
            {
                "id": eid,
                "subtype": subtype,
                "trigger": trigger,
                "delta": delta,
                "mc": mc,
                "tmin": tmin,
                "cooldown": cooldown,
            },
        )

    # --- medien_events_i18n (DE) ---
    events_i18n = [
        (
            "medien_skandal_spesen",
            "Spesenaffäre im Ministerium",
            '„Abgeordnete haben private Reisen als Dienstreisen abgerechnet."',
            "Ein Medienbericht deckt auf: Mehrere Abgeordnete haben private Urlaubsreisen als Dienstreisen abgerechnet. Die Opposition fordert Konsequenzen.",
        ),
        (
            "medien_skandal_datenpanne",
            "Datenleck bei Behörde",
            '„Persönliche Daten von 50.000 Bürgern ungeschützt im Netz."',
            "Ein Hackerangriff hat sensible Daten einer Bundesbehörde kompromittiert. Die Opposition und Datenschützer kritisieren mangelnde IT-Sicherheit.",
        ),
        (
            "medien_skandal_lobbying",
            "Lobby-Einfluss auf Gesetzentwurf",
            '„Internes Papier zeigt: Verbandsvertreter haben Formulierungen diktiert."',
            "Ein investigativer Bericht zeigt, wie Lobbyisten Formulierungen in einen Gesetzentwurf eingebracht haben. Die Regierung gerät unter Druck.",
        ),
        (
            "medien_skandal_koalitionsleck",
            "Koalitionsinterna an Presse geleakt",
            '„Vertrauliches Strategiepapier liegt der Redaktion vor."',
            "Vertrauliche Koalitionsunterlagen sind an die Presse gelangt. Das Vertrauen zwischen den Koalitionspartnern ist beschädigt.",
        ),
        (
            "medien_skandal_haushaltsloch",
            "Haushaltslücke von 20 Milliarden",
            '„Finanzministerium hat Mehrausgaben monatelang verschwiegen."',
            "Eine Haushaltslücke von 20 Milliarden Euro wurde erst spät bekannt. Die Opposition wirft der Regierung Vertuschung vor.",
        ),
        (
            "medien_skandal_persoenlich",
            "Minister in Privataffäre verwickelt",
            '„Bilder von Minister bei privater Feier sorgen für Aufsehen."',
            "Fotos eines Ministers bei einer privaten Feier sorgen für Schlagzeilen. Die Opposition nutzt die Gelegenheit für Angriffe.",
        ),
        (
            "medien_positiv_intl_lob",
            "Internationale Anerkennung",
            '„OECD lobt deutsche Reformpolitik als Vorbild."',
            "Eine OECD-Studie hebt die deutsche Reformpolitik als vorbildlich hervor. Die Regierung erhält unerwartetes Lob aus dem Ausland.",
        ),
        (
            "medien_positiv_opp_fehler",
            "Opposition macht Fehler",
            '„Oppositionsfraktion rudert nach Falschaussage zurück."',
            "Ein Oppositionspolitiker hat sich in einer Debatte schwer verrechnet. Die Medien thematisieren den Rückzieher.",
        ),
        (
            "medien_positiv_buerger_lob",
            "Bürger loben Regierungsarbeit",
            '„Umfrage: Mehrheit zufrieden mit aktueller Politik."',
            "Eine neue Umfrage zeigt: Die Mehrheit der Bürger bewertet die Regierungsarbeit positiv. Die Stimmung in der Bevölkerung hebt sich.",
        ),
    ]

    for eid, title, quote, context in events_i18n:
        conn.execute(
            sa.text("""
                INSERT INTO medien_events_i18n (event_id, locale, title, quote, context)
                VALUES (:eid, 'de', :title, :quote, :context)
            """),
            {"eid": eid, "title": title, "quote": quote, "context": context},
        )

    # --- medien_event_choices + i18n ---
    # event_id, choice_key, cost_pk, medienklima_delta, effekt_zf, char_mood_delta, verband_id, verband_delta
    # label, desc, log_msg
    choice_id = 1
    choices_data = [
        # spesen
        (
            "medien_skandal_spesen",
            "aufklaeren",
            4,
            3,
            0,
            0,
            None,
            0,
            "Aufklären",
            "Vollständige Aufklärung versprechen. Kostet 4 PK, verbessert Medienklima.",
            "Spesenaffäre: Regierung verspricht lückenlose Aufklärung.",
        ),
        (
            "medien_skandal_spesen",
            "schweigen",
            0,
            -2,
            0,
            -1,
            None,
            0,
            "Schweigen",
            "Keine Stellungnahme. Medienklima verschlechtert sich weiter.",
            "Regierung äußert sich nicht zur Spesenaffäre.",
        ),
        (
            "medien_skandal_spesen",
            "ruecktritt",
            0,
            5,
            0,
            2,
            None,
            0,
            "Rücktritt fordern",
            "Betroffenen Rücktritt abverlangen. Stärkt Glaubwürdigkeit.",
            "Regierung fordert Rücktritt des betroffenen Abgeordneten.",
        ),
        # datenpanne
        (
            "medien_skandal_datenpanne",
            "entschuldigen",
            6,
            2,
            0,
            0,
            None,
            0,
            "Öffentlich entschuldigen",
            "Persönliche Entschuldigung, 6 PK. Zeigt Verantwortung.",
            "Regierung entschuldigt sich öffentlich für Datenpanne.",
        ),
        (
            "medien_skandal_datenpanne",
            "untersuchung",
            3,
            1,
            0,
            0,
            None,
            0,
            "Untersuchungsausschuss",
            "Parlamentarische Untersuchung einleiten. 3 PK.",
            "Untersuchungsausschuss zur Datenpanne eingesetzt.",
        ),
        (
            "medien_skandal_datenpanne",
            "bagatellisieren",
            0,
            -4,
            0,
            -2,
            None,
            0,
            "Bagatellisieren",
            "Vorfall als Einzelfall darstellen. Medienklima sinkt.",
            "Regierung stuft Datenpanne als Einzelfall ein.",
        ),
        # lobbying
        (
            "medien_skandal_lobbying",
            "transparenz",
            5,
            4,
            0,
            0,
            None,
            0,
            "Mehr Transparenz",
            "Lobbyregister verschärfen. 5 PK, verbessert Stimmung.",
            "Regierung kündigt verschärftes Lobbyregister an.",
        ),
        (
            "medien_skandal_lobbying",
            "abwehren",
            2,
            -1,
            0,
            0,
            None,
            0,
            "Abwehren",
            "Einfluss bestreiten. Geringe Kosten, wenig Wirkung.",
            "Regierung bestreitet unzulässigen Lobby-Einfluss.",
        ),
        (
            "medien_skandal_lobbying",
            "personell",
            8,
            6,
            0,
            1,
            None,
            0,
            "Personelle Konsequenzen",
            "Verantwortliche ablösen. Klare Ansage.",
            "Regierung kündigt personelle Konsequenzen an.",
        ),
        # koalitionsleck
        (
            "medien_skandal_koalitionsleck",
            "ermitteln",
            6,
            2,
            0,
            0,
            None,
            0,
            "Intern ermitteln",
            "Quelle finden, 6 PK. Zeigt Ernsthaftigkeit.",
            "Koalition leitet interne Ermittlungen zum Leak ein.",
        ),
        (
            "medien_skandal_koalitionsleck",
            "geschlossenheit",
            4,
            3,
            0,
            1,
            None,
            0,
            "Geschlossenheit zeigen",
            "Gemeinsame Pressekonferenz. Stärkt Koalition.",
            "Koalition zeigt Geschlossenheit nach Leak.",
        ),
        (
            "medien_skandal_koalitionsleck",
            "ignorieren",
            0,
            -3,
            0,
            -1,
            None,
            0,
            "Thema ignorieren",
            "Keine Reaktion. Vertrauensverlust.",
            "Koalition äußert sich nicht zum Leak.",
        ),
        # haushaltsloch
        (
            "medien_skandal_haushaltsloch",
            "transparenz",
            8,
            4,
            0,
            0,
            None,
            0,
            "Volle Transparenz",
            "Alle Zahlen offenlegen. 8 PK, entschärft Krise.",
            "Finanzministerium legt Haushaltslage offen.",
        ),
        (
            "medien_skandal_haushaltsloch",
            "sparpaket",
            4,
            1,
            0,
            -1,
            None,
            0,
            "Sparpaket ankündigen",
            "Einsparungen versprechen. Moderate Wirkung.",
            "Regierung kündigt Sparpaket an.",
        ),
        (
            "medien_skandal_haushaltsloch",
            "vertuschen",
            0,
            -6,
            0,
            -2,
            None,
            0,
            "Weiter vertuschen",
            "Keine Änderung. Medienklima bricht ein.",
            "Regierung weigert sich, Haushaltslage zu kommentieren.",
        ),
        # persoenlich
        (
            "medien_skandal_persoenlich",
            "erklaeren",
            3,
            1,
            0,
            0,
            None,
            0,
            "Erklären",
            "Minister stellt sich den Fragen. 3 PK.",
            "Minister erklärt sich zu Privataffäre.",
        ),
        (
            "medien_skandal_persoenlich",
            "entschuldigen",
            5,
            3,
            0,
            0,
            None,
            0,
            "Entschuldigen",
            "Öffentliche Entschuldigung. Zeigt Reue.",
            "Minister entschuldigt sich öffentlich.",
        ),
        (
            "medien_skandal_persoenlich",
            "rechtsweg",
            2,
            -1,
            0,
            0,
            None,
            0,
            "Rechtsweg androhen",
            "Anwalt einschalten. Wirkt defensiv.",
            "Minister droht mit rechtlichen Schritten.",
        ),
        # intl_lob
        (
            "medien_positiv_intl_lob",
            "dankbar",
            0,
            2,
            0,
            1,
            None,
            0,
            "Dankbar aufnehmen",
            "Lob annehmen, keine weiteren Kosten.",
            "Regierung nimmt internationales Lob dankbar auf.",
        ),
        (
            "medien_positiv_intl_lob",
            "nutzen",
            2,
            3,
            0,
            0,
            None,
            0,
            "Medienwirksam nutzen",
            "Pressekonferenz mit OECD. 2 PK.",
            "Regierung präsentiert OECD-Studie medienwirksam.",
        ),
        (
            "medien_positiv_intl_lob",
            "bescheiden",
            0,
            1,
            0,
            1,
            None,
            0,
            "Bescheiden bleiben",
            "Keine große Sache machen. Charaktere zufrieden.",
            "Regierung bleibt bescheiden bei internationalem Lob.",
        ),
        # opp_fehler
        (
            "medien_positiv_opp_fehler",
            "thematisieren",
            2,
            2,
            0,
            0,
            None,
            0,
            "Thematisieren",
            "Oppositionsfehler in Presse thematisieren. 2 PK.",
            "Regierung nutzt Oppositionsfehler für Medienauftritt.",
        ),
        (
            "medien_positiv_opp_fehler",
            "ignorieren",
            0,
            0,
            0,
            0,
            None,
            0,
            "Ignorieren",
            "Keine Reaktion. Würde wahren.",
            "Regierung kommentiert Oppositionsfehler nicht.",
        ),
        (
            "medien_positiv_opp_fehler",
            "nachfragen",
            1,
            1,
            0,
            0,
            None,
            0,
            "Nachfragen",
            "Opposition zu Konsequenzen befragen. 1 PK.",
            "Regierung fordert Opposition zu Stellungnahme auf.",
        ),
        # buerger_lob
        (
            "medien_positiv_buerger_lob",
            "freuen",
            0,
            1,
            0,
            1,
            None,
            0,
            "Freuen",
            "Zufriedenheit zur Kenntnis nehmen. Charaktere erfreut.",
            "Regierung freut sich über positive Umfrage.",
        ),
        (
            "medien_positiv_buerger_lob",
            "kommunizieren",
            1,
            2,
            0,
            0,
            None,
            0,
            "Kommunizieren",
            "Ergebnis in Presse verbreiten. 1 PK.",
            "Regierung kommuniziert Umfrageergebnis aktiv.",
        ),
        (
            "medien_positiv_buerger_lob",
            "vorsichtig",
            0,
            0,
            0,
            0,
            None,
            0,
            "Vorsichtig bleiben",
            "Nicht überinterpretieren. Nüchtern bleiben.",
            "Regierung bleibt bei Umfrage vorsichtig.",
        ),
    ]

    for (
        event_id,
        ckey,
        cost,
        mk_delta,
        ez,
        mood,
        vid,
        vdelta,
        label,
        desc,
        log,
    ) in choices_data:
        conn.execute(
            sa.text("""
                INSERT INTO medien_event_choices (id, event_id, choice_key, cost_pk, medienklima_delta, effekt_zf, char_mood_delta, verband_id, verband_delta)
                VALUES (:id, :event_id, :ckey, :cost, :mk_delta, :ez, :mood, :vid, :vdelta)
            """),
            {
                "id": choice_id,
                "event_id": event_id,
                "ckey": ckey,
                "cost": cost,
                "mk_delta": mk_delta,
                "ez": ez,
                "mood": mood,
                "vid": vid,
                "vdelta": vdelta,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO medien_event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label, "desc": desc, "log_msg": log},
        )
        choice_id += 1

    conn.execute(
        sa.text("SELECT setval('medien_event_choices_id_seq', :max_id)"),
        {"max_id": choice_id - 1},
    )


def downgrade() -> None:
    """Remove 9 Medien-Events und Choices."""
    conn = op.get_bind()
    event_ids = [
        "medien_skandal_spesen",
        "medien_skandal_datenpanne",
        "medien_skandal_lobbying",
        "medien_skandal_koalitionsleck",
        "medien_skandal_haushaltsloch",
        "medien_skandal_persoenlich",
        "medien_positiv_intl_lob",
        "medien_positiv_opp_fehler",
        "medien_positiv_buerger_lob",
    ]
    for eid in event_ids:
        conn.execute(
            sa.text("""
                DELETE FROM medien_event_choices_i18n
                WHERE choice_id IN (SELECT id FROM medien_event_choices WHERE event_id = :eid)
            """),
            {"eid": eid},
        )
        conn.execute(
            sa.text("DELETE FROM medien_event_choices WHERE event_id = :eid"),
            {"eid": eid},
        )
        conn.execute(
            sa.text("DELETE FROM medien_events_i18n WHERE event_id = :eid"),
            {"eid": eid},
        )
        conn.execute(sa.text("DELETE FROM medien_events WHERE id = :eid"), {"eid": eid})
