"""SMA-406: Weitere Gesetze — Sicherheit, Digital, Wohnen, Bildung, Gesundheit, Umwelt, Agrar/Handel.

Revision ID: 050_politikfelder_erweiterung
Revises: 049_politikfelder_content
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "050_politikfelder_erweiterung"
down_revision: Union[str, Sequence[str], None] = "049_politikfelder_content"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEKTOR_BY_PF: dict[str, list[dict[str, Any]]] = {
    "landwirtschaft": [
        {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 1},
        {"sektor": "gruen", "delta": 2, "verzoegerung_monate": 2},
    ],
    "umwelt_energie": [
        {"sektor": "gruen", "delta": 6, "verzoegerung_monate": 2},
        {"sektor": "industrie", "delta": -3, "verzoegerung_monate": 3},
    ],
    "innere_sicherheit": [
        {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 1},
        {"sektor": "finanz", "delta": -1, "verzoegerung_monate": 2},
    ],
    "digital_infrastruktur": [
        {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
        {"sektor": "industrie", "delta": 2, "verzoegerung_monate": 2},
    ],
    "wirtschaft_finanzen": [
        {"sektor": "industrie", "delta": 4, "verzoegerung_monate": 1},
        {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
    ],
    "arbeit_soziales": [
        {"sektor": "arbeit", "delta": 5, "verzoegerung_monate": 0},
        {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 2},
    ],
    "bildung_forschung": [
        {"sektor": "arbeit", "delta": 3, "verzoegerung_monate": 2},
        {"sektor": "finanz", "delta": -2, "verzoegerung_monate": 1},
    ],
    "gesundheit_pflege": [
        {"sektor": "konsum", "delta": 3, "verzoegerung_monate": 0},
        {"sektor": "arbeit", "delta": 2, "verzoegerung_monate": 1},
    ],
}


def upgrade() -> None:
    conn = op.get_bind()

    # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, pfs[], ke, kl, einn, pfl, inv, minc
    gesetze_rows: list[tuple[Any, ...]] = [
        (
            "agrar_importtransparenz_gesetz",
            ["bund", "eu"],
            51,
            0,
            -0.2,
            -0.2,
            3,
            4,
            False,
            -20,
            -25,
            15,
            "landwirtschaft",
            ["wirtschaft_finanzen"],
            -0.5,
            -0.3,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "energie_agrar_pv_rahmen",
            ["bund", "land", "eu"],
            50,
            -0.15,
            -0.5,
            -0.25,
            4,
            5,
            False,
            -45,
            -35,
            20,
            "umwelt_energie",
            ["landwirtschaft"],
            -3.5,
            -0.4,
            0.0,
            0.0,
            True,
            2,
        ),
        (
            "cyber_abwehr_kritische_infrastruktur",
            ["bund", "land"],
            54,
            0,
            -0.2,
            0,
            3,
            4,
            False,
            20,
            30,
            45,
            "digital_infrastruktur",
            ["innere_sicherheit"],
            -2.0,
            -1.5,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "parlament_auslandseinsaetze_gesetz",
            ["bund"],
            57,
            0,
            -0.1,
            0.1,
            2,
            3,
            False,
            10,
            40,
            -35,
            "innere_sicherheit",
            [],
            0.0,
            -0.2,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "grenzkontrolle_grenzregion_ausbau",
            ["bund", "land"],
            49,
            0,
            -0.15,
            0.1,
            2,
            3,
            False,
            25,
            65,
            40,
            "innere_sicherheit",
            [],
            -1.0,
            -0.8,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "schengen_grenzmanagement_modernisierung",
            ["bund", "eu"],
            53,
            0,
            -0.1,
            -0.1,
            3,
            4,
            True,
            -15,
            -20,
            -25,
            "innere_sicherheit",
            [],
            -0.8,
            -0.5,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "digitale_maerkte_wettbewerbsgesetz",
            ["bund", "eu"],
            52,
            -0.2,
            0.1,
            0.2,
            3,
            4,
            False,
            15,
            -15,
            30,
            "digital_infrastruktur",
            ["wirtschaft_finanzen"],
            -0.5,
            -0.4,
            0.5,
            0.0,
            False,
            3,
        ),
        (
            "wohnraumfoerderung_bund_programm",
            ["bund", "land", "kommunen"],
            55,
            -0.15,
            -0.4,
            -0.3,
            5,
            5,
            True,
            -50,
            -30,
            -35,
            "arbeit_soziales",
            ["wirtschaft_finanzen"],
            -6.0,
            -1.0,
            0.0,
            0.0,
            True,
            2,
        ),
        (
            "oepnv_finanzsicherung_bundeslaender",
            ["bund", "land", "kommunen"],
            53,
            -0.2,
            -0.3,
            -0.2,
            4,
            4,
            True,
            -25,
            -20,
            10,
            "digital_infrastruktur",
            ["wirtschaft_finanzen"],
            -4.0,
            -1.2,
            0.0,
            0.0,
            True,
            2,
        ),
        (
            "hochschulfinanzierung_fl_perspektive",
            ["bund", "land"],
            52,
            -0.2,
            -0.3,
            -0.2,
            5,
            5,
            True,
            -35,
            -25,
            -30,
            "bildung_forschung",
            ["arbeit_soziales"],
            -5.0,
            -0.8,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "berufsausbildung_digitalisierung_gesetz",
            ["bund", "land"],
            54,
            -0.25,
            -0.35,
            -0.3,
            4,
            5,
            False,
            10,
            -30,
            -25,
            "bildung_forschung",
            ["arbeit_soziales"],
            -2.5,
            -0.6,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "gkv_beitragsstabilisierung_gesetz",
            ["bund"],
            50,
            -0.1,
            -0.35,
            -0.2,
            4,
            5,
            False,
            5,
            10,
            20,
            "gesundheit_pflege",
            ["wirtschaft_finanzen"],
            0.0,
            -0.5,
            2.0,
            0.5,
            False,
            2,
        ),
        (
            "epa_gesundheitsdaten_gesetz",
            ["bund", "land"],
            51,
            -0.15,
            -0.4,
            -0.15,
            4,
            4,
            False,
            -10,
            -25,
            35,
            "digital_infrastruktur",
            ["gesundheit_pflege"],
            -1.5,
            -0.8,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "pflegepersonal_mindestbesetzung_gesetz",
            ["bund", "land"],
            48,
            -0.1,
            -0.55,
            -0.25,
            5,
            6,
            False,
            -40,
            -35,
            30,
            "gesundheit_pflege",
            [],
            -2.0,
            -2.5,
            0.0,
            1.0,
            False,
            2,
        ),
        (
            "waermewende_gebaeude_beschleunigung",
            ["bund", "land", "kommunen"],
            49,
            -0.2,
            -0.55,
            -0.35,
            5,
            6,
            True,
            -55,
            -40,
            25,
            "umwelt_energie",
            ["arbeit_soziales"],
            -12.0,
            -1.5,
            0.0,
            0.0,
            True,
            2,
        ),
        (
            "wasserstoffkernnetz_industrie",
            ["bund", "land", "eu"],
            51,
            -0.25,
            -0.4,
            0.1,
            4,
            6,
            False,
            20,
            -50,
            40,
            "umwelt_energie",
            ["wirtschaft_finanzen"],
            -18.0,
            -0.8,
            0.0,
            0.0,
            True,
            3,
        ),
    ]

    for row in gesetze_rows:
        (
            gid,
            tags,
            bt,
            ea,
            eh,
            eg,
            ez,
            lag,
            foed,
            iw,
            ig,
            is_,
            pf,
            pfs,
            ke,
            kl,
            einn,
            pfl,
            inv,
            minc,
        ) = row
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        sec_sql = "{" + ",".join(f'"{s}"' for s in pfs) + "}"
        sektor_json = json.dumps(SEKTOR_BY_PF[pf])
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (
                    id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, politikfeld_sekundaer, kosten_einmalig, kosten_laufend, einnahmeeffekt,
                    pflichtausgaben_delta, investiv, min_complexity, sektor_effekte
                )
                VALUES (
                    :id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    CAST(:pfs AS text[]), :ke, :kl, :einn, :pfl, :inv, :minc, CAST(:sektor AS jsonb)
                )
            """),
            {
                "id": gid,
                "tags": tags_sql,
                "bt": bt,
                "ea": ea,
                "eh": eh,
                "eg": eg,
                "ez": ez,
                "lag": lag,
                "foed": foed,
                "iw": iw,
                "ig": ig,
                "is_": is_,
                "pf": pf,
                "pfs": sec_sql,
                "ke": ke,
                "kl": kl,
                "einn": einn,
                "pfl": pfl,
                "inv": inv,
                "minc": minc,
                "sektor": sektor_json,
            },
        )

    new_ids = [r[0] for r in gesetze_rows]
    for nid in new_ids:
        conn.execute(
            sa.text("""
                UPDATE gesetze SET ideologie_wert = GREATEST(-100, LEAST(100,
                    ROUND((COALESCE(ideologie_wirtschaft,0) + COALESCE(ideologie_gesellschaft,0)
                         + COALESCE(ideologie_staat,0)) / 3.0)::integer
                ))
                WHERE id = :id
            """),
            {"id": nid},
        )

    i18n_de = [
        (
            "agrar_importtransparenz_gesetz",
            "Agrar-Importtransparenz- und Kennzeichnungsgesetz",
            "AITG",
            "Strengere Herkunfts- und Standardskennzeichnung für Agrarimporte; mehr Fairness für inländische Erzeuger.",
        ),
        (
            "energie_agrar_pv_rahmen",
            "Agri-Photovoltaik-Rahmengesetz",
            "Agri-PV",
            "Bundesrechtlicher Rahmen für dual genutzte Flächen: Strom aus der Fläche ohne vollständigen Verzicht auf Nutzung.",
        ),
        (
            "cyber_abwehr_kritische_infrastruktur",
            "Cybersicherheitsstärkungsgesetz Kritische Infrastrukturen",
            "CS-KRIT",
            "Meldepflichten, Mindeststandards und Lagezentren für KRITIS-Betreiber; Abwehr gegen Angriffe auf Energie, Verkehr und Gesundheit.",
        ),
        (
            "parlament_auslandseinsaetze_gesetz",
            "Parlamentsbeteiligungsgesetz Auslandseinsätze",
            "ParlAusl",
            "Verfahrensregeln und erweiterte parlamentarische Kontrolle bei bewaffneten Auslandseinsätzen der Bundeswehr.",
        ),
        (
            "grenzkontrolle_grenzregion_ausbau",
            "Grenzkontroll-Infrastrukturgesetz",
            "GKG",
            "Ausbau personeller und technischer Kapazitäten an den Außengrenzen; Fokus auf Grenzregionen.",
        ),
        (
            "schengen_grenzmanagement_modernisierung",
            "Schengen-Grenzmanagement-Modernisierungsgesetz",
            "SGMG",
            "Digitaler Datenaustausch, gemeinsame Patrouillen und EU-Koordination statt nationaler Alleingänge an den Grenzen.",
        ),
        (
            "digitale_maerkte_wettbewerbsgesetz",
            "Digitale-Märkte-Wettbewerbsgesetz",
            "DMWG",
            "Regeln gegen marktbeherrschende Plattformen: Zugang, Interoperabilität und fairen Wettbewerb für Mittelstand und Start-ups.",
        ),
        (
            "wohnraumfoerderung_bund_programm",
            "Bundesprogramm Sozialer Wohnungsbau",
            "BSW",
            "Kofinanzierung mit Ländern und Kommunen für bezahlbaren Neubau und Erhalt sozial gebundenen Wohnraums.",
        ),
        (
            "oepnv_finanzsicherung_bundeslaender",
            "ÖPNV-Finanzsicherungsgesetz",
            "ÖFG",
            "Dauerhaftere Bundesbeteiligung an Regional- und SPNV-Kosten; Planungssicherheit für Länder und Kommunen.",
        ),
        (
            "hochschulfinanzierung_fl_perspektive",
            "Hochschulfinanzierungsgesetz Fläche und Qualität",
            "HFG-FQ",
            "Mehr Grundfinanzierung für Hochschulen außerhalb von Exzellenzverbünden; Studienplätze und Lehre stärken.",
        ),
        (
            "berufsausbildung_digitalisierung_gesetz",
            "Berufsbildungs-Digitalisierungsgesetz",
            "BBDig",
            "Digitale Lernorte, Zertifikate und Schnittstellen zwischen Schule, Betrieb und Kammern in der dualen Ausbildung.",
        ),
        (
            "gkv_beitragsstabilisierung_gesetz",
            "GKV-Beitragsstabilisierungsgesetz",
            "GKV-BSt",
            "Beitragssatz-Obergrenze und Ausgleich über Bund und Arbeitgeber; Entlastung der Versicherten bei steigenden Kosten.",
        ),
        (
            "epa_gesundheitsdaten_gesetz",
            "Elektronische Patientenakte und Gesundheitsdaten-Gesetz",
            "ePA-GD",
            "Rechte auf Datenportabilität, Opt-in für Forschung und einheitliche Standards für die elektronische Akte.",
        ),
        (
            "pflegepersonal_mindestbesetzung_gesetz",
            "Pflegepersonal-Mindestbesetzungsgesetz",
            "PPMG",
            "Verbindliche Personaluntergrenzen in ausgewählten Bereichen der stationären Versorgung mit Übergangsfristen.",
        ),
        (
            "waermewende_gebaeude_beschleunigung",
            "Gebäude-Wärmewende-Beschleunigungsgesetz",
            "GWBG",
            "Förderprogramme und vereinfachte Verfahren für Sanierung, Wärmepumpen und kommunalen Wärmeplanung.",
        ),
        (
            "wasserstoffkernnetz_industrie",
            "Wasserstoffkernnetz- und Industrieanbindungsgesetz",
            "WHK-Ind",
            "Investitionen in Leitungen, Elektrolyse und Anschluss energieintensiver Standorte an grünen Wasserstoff.",
        ),
    ]

    i18n_en = [
        (
            "agrar_importtransparenz_gesetz",
            "Agricultural Import Transparency and Labelling Act",
            "AITA",
            "Stricter origin and standards labelling for agricultural imports; more fairness for domestic producers.",
        ),
        (
            "energie_agrar_pv_rahmen",
            "Agrivoltaics Framework Act",
            "Agri-PV",
            "Federal framework for dual-use land: power generation without fully giving up agricultural use.",
        ),
        (
            "cyber_abwehr_kritische_infrastruktur",
            "Critical Infrastructure Cybersecurity Strengthening Act",
            "CS-CRIT",
            "Reporting duties, minimum standards and situational awareness for critical infrastructure operators.",
        ),
        (
            "parlament_auslandseinsaetze_gesetz",
            "Parliamentary Participation Act for Foreign Deployments",
            "ParlFD",
            "Procedures and extended parliamentary scrutiny for Bundeswehr deployments abroad.",
        ),
        (
            "grenzkontrolle_grenzregion_ausbau",
            "Border Control Infrastructure Act",
            "BCIA",
            "Expansion of staffing and technology at external borders, with focus on border regions.",
        ),
        (
            "schengen_grenzmanagement_modernisierung",
            "Schengen Border Management Modernisation Act",
            "SBMMA",
            "Digital data exchange, joint patrols and EU coordination instead of purely national border measures.",
        ),
        (
            "digitale_maerkte_wettbewerbsgesetz",
            "Digital Markets Competition Act",
            "DMCA",
            "Rules on dominant platforms: access, interoperability and fair competition for SMEs and start-ups.",
        ),
        (
            "wohnraumfoerderung_bund_programm",
            "Federal Social Housing Programme Act",
            "FSHP",
            "Co-financing with states and municipalities for affordable new build and preservation of social housing.",
        ),
        (
            "oepnv_finanzsicherung_bundeslaender",
            "Public Transport Financing Security Act",
            "PTFSA",
            "More stable federal contributions to regional and local rail; planning certainty for states and municipalities.",
        ),
        (
            "hochschulfinanzierung_fl_perspektive",
            "Higher Education Funding Act — Regions and Quality",
            "HEFA-RQ",
            "More baseline funding for universities outside excellence clusters; strengthen places and teaching.",
        ),
        (
            "berufsausbildung_digitalisierung_gesetz",
            "Vocational Training Digitalisation Act",
            "VTDA",
            "Digital learning venues, credentials and interfaces between school, company and chambers in dual training.",
        ),
        (
            "gkv_beitragsstabilisierung_gesetz",
            "Statutory Health Insurance Contribution Stabilisation Act",
            "SHICSA",
            "Contribution caps and balancing via federal government and employers; relief when costs rise.",
        ),
        (
            "epa_gesundheitsdaten_gesetz",
            "Electronic Health Record and Health Data Act",
            "EHR-HDA",
            "Data portability rights, opt-in for research and unified standards for electronic records.",
        ),
        (
            "pflegepersonal_mindestbesetzung_gesetz",
            "Nursing Staff Minimum Staffing Act",
            "NSMSA",
            "Binding minimum staffing in selected inpatient areas with transition periods.",
        ),
        (
            "waermewende_gebaeude_beschleunigung",
            "Building Heat Transition Acceleration Act",
            "BHTAA",
            "Funding and simplified procedures for retrofit, heat pumps and municipal heat planning.",
        ),
        (
            "wasserstoffkernnetz_industrie",
            "Hydrogen Core Network and Industry Linkage Act",
            "HCNILA",
            "Investment in pipelines, electrolysis and connecting energy-intensive sites to green hydrogen.",
        ),
    ]

    for gid, titel, kurz, desc in i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'de', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )
    for gid, titel, kurz, desc in i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    relationen: list[tuple[str, str, str, str, float | None]] = [
        (
            "grenzkontrolle_grenzregion_ausbau",
            "schengen_grenzmanagement_modernisierung",
            "excludes",
            "Nationaler Grenzausbau und Schengen-Koordination schließen sich politisch aus.",
            None,
        ),
        (
            "schengen_grenzmanagement_modernisierung",
            "grenzkontrolle_grenzregion_ausbau",
            "excludes",
            "Nationaler Grenzausbau und Schengen-Koordination schließen sich politisch aus.",
            None,
        ),
        (
            "pflegepersonal_mindestbesetzung_gesetz",
            "pflegereform",
            "requires",
            "Mindestbesetzung setzt die Grundlagen der Pflegereform voraus.",
            None,
        ),
        (
            "waermewende_gebaeude_beschleunigung",
            "klimaschutz",
            "enhances",
            "Gebäudewärmewende verstärkt die Wirkung des Klimaschutzprogramms.",
            1.12,
        ),
        (
            "wasserstoffkernnetz_industrie",
            "klimaschutz",
            "enhances",
            "Wasserstoffinfrastruktur ergänzt das Klimaschutzprogramm.",
            1.12,
        ),
        (
            "energie_agrar_pv_rahmen",
            "ee",
            "enhances",
            "Agri-PV ergänzt den Ausbau erneuerbarer Energien.",
            1.1,
        ),
        (
            "berufsausbildung_digitalisierung_gesetz",
            "mindestlohn",
            "enhances",
            "Digitale Ausbildung und faire Entlohnung verstärken sich in der Praxis.",
            1.08,
        ),
    ]
    for ga, gb, rtyp, besch, efak in relationen:
        conn.execute(
            sa.text("""
                INSERT INTO gesetz_relationen (gesetz_a_id, gesetz_b_id, relation_typ, beschreibung_de, enhances_faktor)
                VALUES (:ga, :gb, :rtyp, :besch, CAST(:efak AS numeric))
            """),
            {"ga": ga, "gb": gb, "rtyp": rtyp, "besch": besch, "efak": efak},
        )

    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen (id, char_id, gesetz_ref_id, trigger_type, min_complexity, cooldown_months)
            VALUES ('braun_cyber_abwehr', 'im', 'cyber_abwehr_kritische_infrastruktur', 'mood+ideologie_distanz', 2, 8)
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
            VALUES (
                'braun_cyber_abwehr', 'de',
                'Cybersicherheit KRITIS',
                'Braun initiiert ein Gesetz zur Abwehr von Cyberangriffen auf kritische Infrastrukturen.',
                '„Ohne resilienten Staat keine innere Sicherheit.“'
            )
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
            VALUES (
                'braun_cyber_abwehr', 'en',
                'Cybersecurity for critical infrastructure',
                'Braun initiates legislation to defend against cyber attacks on critical infrastructure.',
                '„Without a resilient state there is no domestic security.“'
            )
        """),
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text("DELETE FROM ministerial_initiativen_i18n WHERE initiative_id = 'braun_cyber_abwehr'")
    )
    conn.execute(sa.text("DELETE FROM ministerial_initiativen WHERE id = 'braun_cyber_abwehr'"))

    new_law_ids = [
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
    ]
    conn.execute(
        sa.text("""
            DELETE FROM gesetz_relationen
            WHERE gesetz_a_id = ANY(:ids) OR gesetz_b_id = ANY(:ids)
        """),
        {"ids": new_law_ids},
    )

    for gid in new_law_ids:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :g"), {"g": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :g"), {"g": gid})
