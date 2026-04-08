"""SMA-501: Seed Agenda-Ziele, Koalitionsziele, Langzeitwirkungen Gesetze.

Revision ID: 058_sma501_agenda_koalition_seed
Revises: 057_sma500_agenda_koalition_langzeit
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "058_sma501_agenda_koalition_seed"
down_revision: Union[str, Sequence[str], None] = "057_sma500_agenda_koalition_langzeit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    agenda = [
        {'id': 'ag_gesetz_klimawende', 'kategorie': 'gesetzgebung', 'schwierigkeit': 3, 'partei_filter': ['sdp', 'gp', 'lp'], 'min_complexity': 1, 'bedingung_typ': 'gesetz_politikfeld', 'bedingung_param': {'politikfeld_id': 'umwelt_energie', 'min_beschlossen': 2}, 'titel_de': 'Klimawende voranbringen', 'beschreibung_de': 'Mindestens zwei Gesetze aus dem Politikfeld Umwelt & Energie erfolgreich beschließen.'},
        {'id': 'ag_gesetz_wirtschaftsstandort', 'kategorie': 'gesetzgebung', 'schwierigkeit': 3, 'partei_filter': ['cdp', 'ldp'], 'min_complexity': 1, 'bedingung_typ': 'gesetz_politikfeld', 'bedingung_param': {'politikfeld_id': 'wirtschaft_finanzen', 'min_beschlossen': 2}, 'titel_de': 'Wirtschaftsstandort stärken', 'beschreibung_de': 'Mindestens zwei Gesetze aus Wirtschaft & Finanzen beschließen.'},
        {'id': 'ag_gesetz_breit_regieren', 'kategorie': 'gesetzgebung', 'schwierigkeit': 2, 'partei_filter': None, 'min_complexity': 1, 'bedingung_typ': 'gesetz_anzahl_beschlossen', 'bedingung_param': {'min_beschlossen': 5}, 'titel_de': 'Breit regieren', 'beschreibung_de': 'Fünf beliebige Gesetze in der Legislatur erfolgreich verabschieden.'},
        {'id': 'ag_milieu_prekaere', 'kategorie': 'milieu', 'schwierigkeit': 3, 'partei_filter': ['sdp', 'gp', 'lp'], 'min_complexity': 2, 'bedingung_typ': 'milieu_zustimmung_min', 'bedingung_param': {'milieu_id': 'prekaere', 'min_pct': 42}, 'titel_de': 'Prekäre erreichen', 'beschreibung_de': 'Milieu „Prekäre“ mindestens auf 42 % Zustimmung halten oder erreichen.'},
        {'id': 'ag_milieu_mitte', 'kategorie': 'milieu', 'schwierigkeit': 2, 'partei_filter': None, 'min_complexity': 1, 'bedingung_typ': 'milieu_zustimmung_min', 'bedingung_param': {'milieu_id': 'soziale_mitte', 'min_pct': 48}, 'titel_de': 'Mitte halten', 'beschreibung_de': 'Die soziale Mitte stabil bei mindestens 48 % Zustimmung halten.'},
        {'id': 'ag_medien_praesenz', 'kategorie': 'medien', 'schwierigkeit': 2, 'partei_filter': None, 'min_complexity': 2, 'bedingung_typ': 'medienklima_monate_min', 'bedingung_param': {'schwelle': 55, 'min_monate': 24}, 'titel_de': 'Medienpräsenz', 'beschreibung_de': 'In mindestens 24 Monaten ein Medienklima von über 55 halten.'},
        {'id': 'ag_medien_krisenfest', 'kategorie': 'medien', 'schwierigkeit': 3, 'partei_filter': None, 'min_complexity': 2, 'bedingung_typ': 'medienklima_monate_max_unter', 'bedingung_param': {'schwelle': 35, 'max_monate': 6}, 'titel_de': 'Krisenfest in der Öffentlichkeit', 'beschreibung_de': 'Höchstens sechs Monate mit Medienklima unter 35.'},
        {'id': 'ag_verband_gewerkschaften', 'kategorie': 'verbaende', 'schwierigkeit': 2, 'partei_filter': ['sdp', 'gp', 'lp'], 'min_complexity': 1, 'bedingung_typ': 'verband_beziehung_min', 'bedingung_param': {'verband_id': 'gbd', 'min_beziehung': 60}, 'titel_de': 'Gewerkschaften an Bord', 'beschreibung_de': 'Beziehung zum GBD mindestens 60 halten.'},
        {'id': 'ag_verband_wirtschaft', 'kategorie': 'verbaende', 'schwierigkeit': 2, 'partei_filter': ['cdp', 'ldp'], 'min_complexity': 1, 'bedingung_typ': 'verband_beziehung_min', 'bedingung_param': {'verband_id': 'bdi', 'min_beziehung': 58}, 'titel_de': 'Wirtschaftsverbände binden', 'beschreibung_de': 'Beziehung zum BDI mindestens 58 halten.'},
        {'id': 'ag_haushalt_schwarze_null', 'kategorie': 'haushalt', 'schwierigkeit': 4, 'partei_filter': ['cdp', 'ldp'], 'min_complexity': 2, 'bedingung_typ': 'haushalt_saldo_min', 'bedingung_param': {'min_saldo_mrd': 0.0, 'min_monate_am_stueck': 12}, 'titel_de': 'Schwarze Null', 'beschreibung_de': 'Mindestens zwölf Monate in Folge einen nicht negativen Haushaltssaldo (≥ 0 Mrd. €).'},
        {'id': 'ag_haushalt_investition', 'kategorie': 'haushalt', 'schwierigkeit': 3, 'partei_filter': ['sdp', 'gp', 'lp'], 'min_complexity': 2, 'bedingung_typ': 'gesetz_investiv_beschlossen', 'bedingung_param': {'min_beschlossen': 3}, 'titel_de': 'Investitionsoffensive', 'beschreibung_de': 'Drei als investiv markierte Gesetze erfolgreich beschließen.'},
        {'id': 'ag_kabinett_zusammenhalt', 'kategorie': 'kabinett', 'schwierigkeit': 3, 'partei_filter': None, 'min_complexity': 2, 'bedingung_typ': 'char_mood_min_durchschnitt', 'bedingung_param': {'min_avg_mood': 3.0}, 'titel_de': 'Kabinettszusammenhalt', 'beschreibung_de': 'Durchschnittliche Stimmung aller Kabinettsmitglieder mindestens 3,0 halten.'},
    ]
    for z in agenda:
        conn.execute(
            sa.text(
                """
                INSERT INTO agenda_ziele (
                    id, kategorie, schwierigkeit, partei_filter, min_complexity,
                    bedingung_typ, bedingung_param
                ) VALUES (
                    :id, :kat, :schw, CAST(:pf AS jsonb), :mc, :bt, CAST(:bp AS jsonb)
                )
                """
            ),
            {
                "id": z["id"],
                "kat": z["kategorie"],
                "schw": z["schwierigkeit"],
                "pf": json.dumps(z.get("partei_filter")),
                "mc": z["min_complexity"],
                "bt": z["bedingung_typ"],
                "bp": json.dumps(z["bedingung_param"]),
            },
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO agenda_ziele_i18n (agenda_ziel_id, locale, titel, beschreibung)
                VALUES (:id, 'de', :titel, :besch)
                """
            ),
            {"id": z["id"], "titel": z["titel_de"], "besch": z["beschreibung_de"]},
        )

    kziele = [
        {'id': 'kz_gp_umweltgesetz', 'partner_profil': 'gp', 'kategorie': 'gesetzgebung', 'min_complexity': 1, 'bedingung_typ': 'gesetz_politikfeld', 'bedingung_param': {'politikfeld_id': 'umwelt_energie', 'min_beschlossen': 1}, 'beziehung_malus': 8, 'titel_de': 'Grüne: klares Umweltgesetz', 'beschreibung_de': 'Mindestens ein Gesetz aus Umwelt & Energie muss beschlossen werden — sonst wächst der Druck aus der Koalition.'},
        {'id': 'kz_gp_postmateriell', 'partner_profil': 'gp', 'kategorie': 'milieu', 'min_complexity': 1, 'bedingung_typ': 'milieu_zustimmung_min', 'bedingung_param': {'milieu_id': 'postmaterielle', 'min_pct': 45}, 'beziehung_malus': 6, 'titel_de': 'Postmaterielles Milieu', 'beschreibung_de': 'Die postmaterielle Zustimmung soll mindestens 45 % nicht unterschreiten.'},
        {'id': 'kz_gp_uvb', 'partner_profil': 'gp', 'kategorie': 'verbaende', 'min_complexity': 1, 'bedingung_typ': 'verband_beziehung_min', 'bedingung_param': {'verband_id': 'uvb', 'min_beziehung': 50}, 'beziehung_malus': 5, 'titel_de': 'UVB nicht verprellen', 'beschreibung_de': 'Beziehung zum Umweltverband (UVB) mindestens bei 50 halten.'},
        {'id': 'kz_sdp_sozialgesetz', 'partner_profil': 'sdp', 'kategorie': 'gesetzgebung', 'min_complexity': 1, 'bedingung_typ': 'gesetz_politikfeld', 'bedingung_param': {'politikfeld_id': 'arbeit_soziales', 'min_beschlossen': 1}, 'beziehung_malus': 8, 'titel_de': 'SPD: Sozialpolitisches Signal', 'beschreibung_de': 'Mindestens ein Gesetz aus Arbeit & Soziales muss beschlossen werden.'},
        {'id': 'kz_sdp_soziale_mitte', 'partner_profil': 'sdp', 'kategorie': 'milieu', 'min_complexity': 1, 'bedingung_typ': 'milieu_zustimmung_min', 'bedingung_param': {'milieu_id': 'soziale_mitte', 'min_pct': 45}, 'beziehung_malus': 6, 'titel_de': 'Soziale Mitte sichern', 'beschreibung_de': 'Zustimmung der sozialen Mitte mindestens 45 %.'},
        {'id': 'kz_sdp_gbd', 'partner_profil': 'sdp', 'kategorie': 'verbaende', 'min_complexity': 1, 'bedingung_typ': 'verband_beziehung_min', 'bedingung_param': {'verband_id': 'gbd', 'min_beziehung': 50}, 'beziehung_malus': 5, 'titel_de': 'Gewerkschafts-Vertrauen', 'beschreibung_de': 'Beziehung zum GBD mindestens 50 halten.'},
    ]
    for z in kziele:
        conn.execute(
            sa.text(
                """
                INSERT INTO koalitions_ziele (
                    id, partner_profil, kategorie, min_complexity,
                    bedingung_typ, bedingung_param, beziehung_malus
                ) VALUES (
                    :id, :pp, :kat, :mc, :bt, CAST(:bp AS jsonb), :bm
                )
                """
            ),
            {
                "id": z["id"],
                "pp": z["partner_profil"],
                "kat": z["kategorie"],
                "mc": z["min_complexity"],
                "bt": z["bedingung_typ"],
                "bp": json.dumps(z["bedingung_param"]),
                "bm": z["beziehung_malus"],
            },
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO koalitions_ziele_i18n
                    (koalitions_ziel_id, locale, titel, beschreibung)
                VALUES (:id, 'de', :titel, :besch)
                """
            ),
            {"id": z["id"], "titel": z["titel_de"], "besch": z["beschreibung_de"]},
        )

    for gid, score, pos, neg in [
        (
            "mindestlohn",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "pflegereform",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "kh_reform",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "digi_bildung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "buerokratieabbau",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "ki_foerder",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "sicherheit_paket",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "laenderkompetenz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "klimaschutz",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "lieferkette",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "grundrechte",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "sondervermoegen_klima",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "schuldenbremse_reform",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "vermoegensteuer",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "steuerreform_2",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "nahverkehr_ausbau",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "kitaausbau",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "stadtentwicklung",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "gemeindeordnung_reform",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "laender_polizeigesetz",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "hochschulrahmen",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "laenderfinanzausgleich_reform",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "est_entlastung",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "spitzensteuersatz",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "unternehmenssteuer_reform",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "co2_steuer",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "erbschaftssteuer",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "plattformsteuer",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "sozialleistungen_kuerzen",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "beamtenbesoldung_einfrieren",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "subventionen_abbau",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "rente_stabilisierung",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "effizienzprogramm_bund",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "verbraucherschutz_digital",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "tierschutzgesetz_reform",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "naturschutz_renaturierung",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "polizei_ausstattung",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "migrationsbegrenzung",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "deregulierung_gewerbe",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "privatisierung_infrastruktur",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "familienpolitik_klassisch",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "mietpreisbremse_verschaerfung",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "viertagewoche",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "grundeinkommen_modell",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "schulgeld_abschaffung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "forschungsfoerderung_ki",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "est_plus_2",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "est_minus_2",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "koerp_minus_3",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "mwst_plus_1",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "co2_plus_25",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "vermoegensteuer_einfuehren",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "digitalsteuer_einfuehren",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "spitzensteuersatz_plus",
            6,
            ["Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.", "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung."],
            ["Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.", "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu."],
        ),
        (
            "agrar_oekologie_programm",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "agrar_subventionsabbau",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "agrar_tierhaltung_upgrade",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "agrar_premium_ausbau",
            5,
            ["Ökologischer Umbau der Landwirtschaft und fairere Wettbewerbsbedingungen.", "Tierwohl und Verbrauchertransparenz langfristig verbessert."],
            ["Einkommenseinbrüche in strukturschwachen Agrarregionen.", "Importkonkurrenz und Handelskonflikte mit Partnerstaaten."],
        ),
        (
            "arbeit_tarifbindung_staerkung",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "arbeit_qualifizierung_bafoeg",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "gesundheit_praevention_gesetz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "gesundheit_krankenhaus_notlage",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "verkehr_digital_ausbau",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "agrar_importtransparenz_gesetz",
            5,
            ["Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.", "Politische Handlungsspielräume in späteren Jahren werden gewahrt."],
            ["Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.", "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen."],
        ),
        (
            "energie_agrar_pv_rahmen",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "cyber_abwehr_kritische_infrastruktur",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "parlament_auslandseinsaetze_gesetz",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "grenzkontrolle_grenzregion_ausbau",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "schengen_grenzmanagement_modernisierung",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "digitale_maerkte_wettbewerbsgesetz",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "wohnraumfoerderung_bund_programm",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "oepnv_finanzsicherung_bundeslaender",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "hochschulfinanzierung_fl_perspektive",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "berufsausbildung_digitalisierung_gesetz",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "gkv_beitragsstabilisierung_gesetz",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "epa_gesundheitsdaten_gesetz",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "pflegepersonal_mindestbesetzung_gesetz",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "waermewende_gebaeude_beschleunigung",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "wasserstoffkernnetz_industrie",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "verfassungsreform",
            7,
            ["Klare rechtliche und sicherheitspolitische Rahmenbedingungen.", "Bündnisfähigkeit und Schutz kritischer Infrastruktur."],
            ["Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.", "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit."],
        ),
        (
            "katastrophenschutz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "cybersicherheit",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "whistleblowerschutz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "tarifbindung",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "mietrecht",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "demokratiefoerderung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "fachkraefte",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "rentenreform",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "pandemieschutz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "agrarstruktur",
            5,
            ["Ökologischer Umbau der Landwirtschaft und fairere Wettbewerbsbedingungen.", "Tierwohl und Verbrauchertransparenz langfristig verbessert."],
            ["Einkommenseinbrüche in strukturschwachen Agrarregionen.", "Importkonkurrenz und Handelskonflikte mit Partnerstaaten."],
        ),
        (
            "tierwohl_label",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "bauernentlastung",
            5,
            ["Ökologischer Umbau der Landwirtschaft und fairere Wettbewerbsbedingungen.", "Tierwohl und Verbrauchertransparenz langfristig verbessert."],
            ["Einkommenseinbrüche in strukturschwachen Agrarregionen.", "Importkonkurrenz und Handelskonflikte mit Partnerstaaten."],
        ),
        (
            "buergerversicherung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "pflegepersonal",
            6,
            ["Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.", "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne."],
            ["Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.", "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt."],
        ),
        (
            "breitband",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "verwaltungsdigital",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "ki_regulierung",
            5,
            ["Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.", "Innovationsimpulse für Wirtschaft und Verwaltung."],
            ["Implementierungskosten und Fachkräftemangel bremsen die Wirkung.", "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung."],
        ),
        (
            "deutschlandticket",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "schienen",
            5,
            ["Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.", "Kommunale Handlungsfähigkeit und Planungssicherheit steigen."],
            ["Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.", "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele."],
        ),
        (
            "hochschulreform",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "bafoegreform",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "weiterbildung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "antikorruption",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "stromnetz_ausbau_beschleunigung",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "offshore_wind_genehmigungspaket",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "kreislaufwirtschaft_verpackung_2",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "industrie_klimaschutz_contracts",
            7,
            ["Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.", "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur."],
            ["Industriestandorte und Energiepreise bleiben langfristig unter Druck.", "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt."],
        ),
        (
            "insolvenzrecht_modernisierung",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "wagniskapital_fondsfoerderprogramm",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "finanzaufsicht_krypto_markets_gesetz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
        (
            "mittelstand_beschaffermacht_gesetz",
            4,
            ["Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.", "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit."],
            ["Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.", "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf."],
        ),
    ]:
        conn.execute(
            sa.text(
                """
                UPDATE gesetze SET
                    langzeit_score = :sc,
                    langzeitwirkung_positiv_de = CAST(:pos AS text[]),
                    langzeitwirkung_negativ_de = CAST(:neg AS text[])
                WHERE id = :gid
                """
            ),
            {
                "gid": gid,
                "sc": score,
                "pos": "{" + ",".join(json.dumps(p) for p in pos) + "}",
                "neg": "{" + ",".join(json.dumps(n) for n in neg) + "}",
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    k_ids = ['kz_gp_umweltgesetz', 'kz_gp_postmateriell', 'kz_gp_uvb', 'kz_sdp_sozialgesetz', 'kz_sdp_soziale_mitte', 'kz_sdp_gbd']
    a_ids = ['ag_gesetz_klimawende', 'ag_gesetz_wirtschaftsstandort', 'ag_gesetz_breit_regieren', 'ag_milieu_prekaere', 'ag_milieu_mitte', 'ag_medien_praesenz', 'ag_medien_krisenfest', 'ag_verband_gewerkschaften', 'ag_verband_wirtschaft', 'ag_haushalt_schwarze_null', 'ag_haushalt_investition', 'ag_kabinett_zusammenhalt']
    for kid in k_ids:
        conn.execute(
            sa.text(
                "DELETE FROM koalitions_ziele_i18n WHERE koalitions_ziel_id = :id AND locale = 'de'"
            ),
            {"id": kid},
        )
    for kid in k_ids:
        conn.execute(sa.text("DELETE FROM koalitions_ziele WHERE id = :id"), {"id": kid})
    for aid in a_ids:
        conn.execute(
            sa.text(
                "DELETE FROM agenda_ziele_i18n WHERE agenda_ziel_id = :id AND locale = 'de'"
            ),
            {"id": aid},
        )
    for aid in a_ids:
        conn.execute(sa.text("DELETE FROM agenda_ziele WHERE id = :id"), {"id": aid})
    g_ids = [
        "mindestlohn",
        "pflegereform",
        "kh_reform",
        "digi_bildung",
        "buerokratieabbau",
        "ki_foerder",
        "sicherheit_paket",
        "laenderkompetenz",
        "klimaschutz",
        "lieferkette",
        "grundrechte",
        "sondervermoegen_klima",
        "schuldenbremse_reform",
        "vermoegensteuer",
        "steuerreform_2",
        "nahverkehr_ausbau",
        "kitaausbau",
        "stadtentwicklung",
        "gemeindeordnung_reform",
        "laender_polizeigesetz",
        "hochschulrahmen",
        "laenderfinanzausgleich_reform",
        "est_entlastung",
        "spitzensteuersatz",
        "unternehmenssteuer_reform",
        "co2_steuer",
        "erbschaftssteuer",
        "plattformsteuer",
        "sozialleistungen_kuerzen",
        "beamtenbesoldung_einfrieren",
        "subventionen_abbau",
        "rente_stabilisierung",
        "effizienzprogramm_bund",
        "verbraucherschutz_digital",
        "tierschutzgesetz_reform",
        "naturschutz_renaturierung",
        "polizei_ausstattung",
        "migrationsbegrenzung",
        "deregulierung_gewerbe",
        "privatisierung_infrastruktur",
        "familienpolitik_klassisch",
        "mietpreisbremse_verschaerfung",
        "viertagewoche",
        "grundeinkommen_modell",
        "schulgeld_abschaffung",
        "forschungsfoerderung_ki",
        "est_plus_2",
        "est_minus_2",
        "koerp_minus_3",
        "mwst_plus_1",
        "co2_plus_25",
        "vermoegensteuer_einfuehren",
        "digitalsteuer_einfuehren",
        "spitzensteuersatz_plus",
        "agrar_oekologie_programm",
        "agrar_subventionsabbau",
        "agrar_tierhaltung_upgrade",
        "agrar_premium_ausbau",
        "arbeit_tarifbindung_staerkung",
        "arbeit_qualifizierung_bafoeg",
        "gesundheit_praevention_gesetz",
        "gesundheit_krankenhaus_notlage",
        "verkehr_digital_ausbau",
        "agrar_importtransparenz_gesetz",
        "energie_agrar_pv_rahmen",
        "cyber_abwehr_kritische_infrastruktur",
        "parlament_auslandseinsaetze_gesetz",
        "grenzkontrolle_grenzregion_ausbau",
        "schengen_grenzmanagement_modernisierung",
        "digitale_maerkte_wettbewerbsgesetz",
        "wohnraumfoerderung_bund_programm",
        "oepnv_finanzsicherung_bundeslaender",
        "hochschulfinanzierung_fl_perspektive",
        "berufsausbildung_digitalisierung_gesetz",
        "gkv_beitragsstabilisierung_gesetz",
        "epa_gesundheitsdaten_gesetz",
        "pflegepersonal_mindestbesetzung_gesetz",
        "waermewende_gebaeude_beschleunigung",
        "wasserstoffkernnetz_industrie",
        "verfassungsreform",
        "katastrophenschutz",
        "cybersicherheit",
        "whistleblowerschutz",
        "tarifbindung",
        "mietrecht",
        "demokratiefoerderung",
        "fachkraefte",
        "rentenreform",
        "pandemieschutz",
        "agrarstruktur",
        "tierwohl_label",
        "bauernentlastung",
        "buergerversicherung",
        "pflegepersonal",
        "breitband",
        "verwaltungsdigital",
        "ki_regulierung",
        "deutschlandticket",
        "schienen",
        "hochschulreform",
        "bafoegreform",
        "weiterbildung",
        "antikorruption",
        "stromnetz_ausbau_beschleunigung",
        "offshore_wind_genehmigungspaket",
        "kreislaufwirtschaft_verpackung_2",
        "industrie_klimaschutz_contracts",
        "insolvenzrecht_modernisierung",
        "wagniskapital_fondsfoerderprogramm",
        "finanzaufsicht_krypto_markets_gesetz",
        "mittelstand_beschaffermacht_gesetz",
    ]
    for gid in g_ids:
        conn.execute(
            sa.text(
                "UPDATE gesetze SET langzeit_score = 0, langzeitwirkung_positiv_de = '{}', langzeitwirkung_negativ_de = '{}' WHERE id = :gid"
            ),
            {"gid": gid},
        )
