"""8 neue Gesetze: Umwelt/Energie + Wirtschaft/Finanzen (DE/EN), Relationen.

Revision ID: 052_umwelt_wirtschaft_gesetze
Revises: 051_gesetze_yaml_ssot
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "052_umwelt_wirtschaft_gesetze"
down_revision: Union[str, Sequence[str], None] = "051_gesetze_yaml_ssot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEKTOR_BY_PF: dict[str, list[dict[str, Any]]] = {
    "umwelt_energie": [
        {"sektor": "gruen", "delta": 6, "verzoegerung_monate": 2},
        {"sektor": "industrie", "delta": -3, "verzoegerung_monate": 3},
    ],
    "wirtschaft_finanzen": [
        {"sektor": "industrie", "delta": 4, "verzoegerung_monate": 1},
        {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
    ],
}


def upgrade() -> None:
    conn = op.get_bind()

    # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, pfs[], ke, kl, einn, pfl, inv, minc, locked
    gesetze_rows: list[tuple[Any, ...]] = [
        (
            "stromnetz_ausbau_beschleunigung",
            ["bund", "land", "eu"],
            50,
            -0.2,
            -0.55,
            -0.2,
            4.0,
            6,
            True,
            -35,
            -30,
            40,
            "umwelt_energie",
            ["digital_infrastruktur"],
            -15.0,
            -1.2,
            0.0,
            0.0,
            True,
            3,
            None,
        ),
        (
            "offshore_wind_genehmigungspaket",
            ["bund", "land", "eu"],
            49,
            -0.25,
            -0.45,
            -0.25,
            5.0,
            6,
            True,
            -40,
            -35,
            35,
            "umwelt_energie",
            ["wirtschaft_finanzen"],
            -8.0,
            -0.6,
            0.0,
            0.0,
            True,
            3,
            None,
        ),
        (
            "kreislaufwirtschaft_verpackung_2",
            ["bund", "land"],
            51,
            -0.15,
            -0.25,
            -0.3,
            3.0,
            4,
            True,
            -45,
            -25,
            25,
            "umwelt_energie",
            ["wirtschaft_finanzen"],
            -2.0,
            -0.4,
            0.3,
            0.0,
            False,
            2,
            None,
        ),
        (
            "industrie_klimaschutz_contracts",
            ["bund", "land", "eu"],
            48,
            -0.2,
            -0.6,
            -0.15,
            4.0,
            5,
            False,
            -30,
            -40,
            30,
            "umwelt_energie",
            ["arbeit_soziales"],
            -12.0,
            -1.5,
            0.0,
            0.0,
            True,
            3,
            None,
        ),
        (
            "insolvenzrecht_modernisierung",
            ["bund"],
            52,
            0.1,
            0.1,
            0.0,
            2.0,
            3,
            False,
            45,
            -10,
            20,
            "wirtschaft_finanzen",
            ["arbeit_soziales"],
            0.0,
            0.0,
            0.0,
            0.0,
            False,
            2,
            None,
        ),
        (
            "wagniskapital_fondsfoerderprogramm",
            ["bund", "eu"],
            51,
            -0.1,
            -0.35,
            0.15,
            3.0,
            4,
            False,
            55,
            -15,
            15,
            "wirtschaft_finanzen",
            ["digital_infrastruktur"],
            -4.0,
            -0.3,
            0.0,
            0.0,
            True,
            2,
            None,
        ),
        (
            "finanzaufsicht_krypto_markets_gesetz",
            ["bund", "eu"],
            50,
            0.0,
            -0.15,
            -0.2,
            2.0,
            3,
            False,
            20,
            -20,
            45,
            "wirtschaft_finanzen",
            ["digital_infrastruktur"],
            -0.8,
            -0.15,
            0.2,
            0.0,
            False,
            2,
            None,
        ),
        (
            "mittelstand_beschaffermacht_gesetz",
            ["bund"],
            53,
            0.05,
            0.0,
            0.1,
            3.0,
            2,
            False,
            30,
            5,
            35,
            "wirtschaft_finanzen",
            ["arbeit_soziales"],
            0.0,
            0.0,
            0.0,
            0.0,
            False,
            2,
            None,
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
            locked,
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
                    pflichtausgaben_delta, investiv, min_complexity, sektor_effekte, locked_until_event
                )
                VALUES (
                    :id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    CAST(:pfs AS text[]), :ke, :kl, :einn, :pfl, :inv, :minc, CAST(:sektor AS jsonb), :locked
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
                "locked": locked,
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

    i18n_de: list[tuple[str, str, str, str]] = [
        (
            "stromnetz_ausbau_beschleunigung",
            "Netzausbau-Beschleunigungsgesetz",
            "NetzBoG",
            "Beschleunigte Trassenplanung und Länderkoordination, um Engpässe bei erneuerbaren Energien zu senken.",
        ),
        (
            "offshore_wind_genehmigungspaket",
            "Offshore-Wind-Genehmigungspaket",
            "OWindG",
            "Genehmigungsfenster, Naturschutz-Ausgleich und Anbindung für mehr Offshore-Leistung.",
        ),
        (
            "kreislaufwirtschaft_verpackung_2",
            "Kreislaufwirtschafts- und Verpackungsgesetz II",
            "KrWG II",
            "Recyclinganteile, Herstellerverantwortung und Meldewege für Verpackungsströme.",
        ),
        (
            "industrie_klimaschutz_contracts",
            "Industrieklimaschutzverträge-Gesetz",
            "IKCG",
            "Vertragsmodelle und Förderkulisse für klimaneutrale Stahl- und Chemiepfade.",
        ),
        (
            "insolvenzrecht_modernisierung",
            "Insolvenzrechtsmodernisierungsgesetz",
            "InsModG",
            "Schnellere Sanierung, klarere Restrukturierung und stärkere Arbeitnehmerrechte in Vorverfahren.",
        ),
        (
            "wagniskapital_fondsfoerderprogramm",
            "Wagniskapital-Förderprogramm-Gesetz",
            "WKFFG",
            "Steuerliche Anreize und Haftungsrahmen für Fonds mit Fokus auf Deep Tech und Gründungen.",
        ),
        (
            "finanzaufsicht_krypto_markets_gesetz",
            "Gesetz zur Ausführung der EU-Krypto-Märkte-Verordnung",
            "MiCA-DG",
            "Lizenzierung, Aufsicht und Meldung für Krypto-Dienstleister im Einklang mit EU-Standards.",
        ),
        (
            "mittelstand_beschaffermacht_gesetz",
            "Mittelstand-Beschaffermacht-Gesetz",
            "MBMG",
            "Schutz vor einseitigen Zahlungs- und Kündigungsklauseln großer Abnehmer gegenüber Zulieferern.",
        ),
    ]

    i18n_en: list[tuple[str, str, str, str]] = [
        (
            "stromnetz_ausbau_beschleunigung",
            "Grid Expansion Acceleration Act",
            "GridExpAct",
            "Faster transmission planning and state coordination to ease renewables bottlenecks.",
        ),
        (
            "offshore_wind_genehmigungspaket",
            "Offshore Wind Permitting Package Act",
            "OffWindPkg",
            "Permitting windows, nature compensation, and grid hook-up for more offshore capacity.",
        ),
        (
            "kreislaufwirtschaft_verpackung_2",
            "Circular Economy and Packaging Act II",
            "CircPack2",
            "Recycled-content rules, producer responsibility, and reporting for packaging flows.",
        ),
        (
            "industrie_klimaschutz_contracts",
            "Industrial Climate Protection Contracts Act",
            "IndCCAct",
            "Contracts and funding rules for low-carbon steel and chemistry pathways.",
        ),
        (
            "insolvenzrecht_modernisierung",
            "Insolvency Law Modernization Act",
            "InsolMod",
            "Faster restructuring, clearer workouts for SMEs, and stronger worker safeguards pre-insolvency.",
        ),
        (
            "wagniskapital_fondsfoerderprogramm",
            "Venture Capital Support Programme Act",
            "VCProgAct",
            "Tax incentives and liability frameworks for funds financing deep tech and startups.",
        ),
        (
            "finanzaufsicht_krypto_markets_gesetz",
            "Act Transposing the EU Crypto-Assets Regulation",
            "MiCATrans",
            "Licensing, supervision, and reporting for crypto-asset service providers under EU rules.",
        ),
        (
            "mittelstand_beschaffermacht_gesetz",
            "SME Buyer-Power Protection Act",
            "SMEBuyAct",
            "Safeguards against one-sided payment and termination clauses by large buyers toward suppliers.",
        ),
    ]

    for gesetz_id, titel, kurz, desc in i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:gid, 'de', :titel, :kurz, :desc)
            """),
            {"gid": gesetz_id, "titel": titel, "kurz": kurz, "desc": desc},
        )
    for gesetz_id, titel, kurz, desc in i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:gid, 'en', :titel, :kurz, :desc)
            """),
            {"gid": gesetz_id, "titel": titel, "kurz": kurz, "desc": desc},
        )

    relationen = [
        (
            "stromnetz_ausbau_beschleunigung",
            "wasserstoffkernnetz_industrie",
            "enhances",
            "Stärkeres Netz erleichtert Industrie-H₂ und Elektrolyse — Synergieeffekt +15%.",
            1.15,
        ),
        (
            "wagniskapital_fondsfoerderprogramm",
            "forschungsfoerderung_ki",
            "enhances",
            "Forschungsförderung und VC-Programm verstärken Deep-Tech-Pipeline — +15%.",
            1.15,
        ),
        (
            "finanzaufsicht_krypto_markets_gesetz",
            "verbraucherschutz_digital",
            "enhances",
            "MiCA-Umsetzung und digitaler Verbraucherschutz ergänzen sich — +10%.",
            1.1,
        ),
    ]

    for ga, gb, typ, beschr, faktor in relationen:
        conn.execute(
            sa.text("""
                INSERT INTO gesetz_relationen (gesetz_a_id, gesetz_b_id, relation_typ, beschreibung_de, enhances_faktor)
                VALUES (:ga, :gb, :typ, :beschr, :faktor)
            """),
            {"ga": ga, "gb": gb, "typ": typ, "beschr": beschr, "faktor": faktor},
        )


def downgrade() -> None:
    conn = op.get_bind()
    new_ids = [
        "stromnetz_ausbau_beschleunigung",
        "offshore_wind_genehmigungspaket",
        "kreislaufwirtschaft_verpackung_2",
        "industrie_klimaschutz_contracts",
        "insolvenzrecht_modernisierung",
        "wagniskapital_fondsfoerderprogramm",
        "finanzaufsicht_krypto_markets_gesetz",
        "mittelstand_beschaffermacht_gesetz",
    ]
    conn.execute(
        sa.text("""
            DELETE FROM gesetz_relationen
            WHERE gesetz_a_id = ANY(:ids) OR gesetz_b_id = ANY(:ids)
        """),
        {"ids": new_ids},
    )
    for gid in new_ids:
        conn.execute(
            sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :g"), {"g": gid}
        )
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :g"), {"g": gid})
