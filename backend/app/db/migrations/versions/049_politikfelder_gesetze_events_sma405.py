"""SMA-405: Politikfelder ausbalancieren — Agrar-, Arbeit-, Gesundheits- und Digital-Gesetze, EU-Agrar, Kommunal-Initiative, Reklassifikation.

Revision ID: 049_politikfelder_content
Revises: 048_sma404_wirtschaftssektoren
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "049_politikfelder_content"
down_revision: Union[str, Sequence[str], None] = "048_sma404_wirtschaftssektoren"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Sektor-Effekte wie in 048 (pro Politikfeld), für neue Gesetze explizit gesetzt
SEKTOR_BY_PF: dict[str, list[dict[str, Any]]] = {
    "landwirtschaft": [
        {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 1},
        {"sektor": "gruen", "delta": 2, "verzoegerung_monate": 2},
    ],
    "arbeit_soziales": [
        {"sektor": "arbeit", "delta": 5, "verzoegerung_monate": 0},
        {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 2},
    ],
    "gesundheit_pflege": [
        {"sektor": "konsum", "delta": 3, "verzoegerung_monate": 0},
        {"sektor": "arbeit", "delta": 2, "verzoegerung_monate": 1},
    ],
    "digital_infrastruktur": [
        {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
        {"sektor": "industrie", "delta": 2, "verzoegerung_monate": 2},
    ],
    "wirtschaft_finanzen": [
        {"sektor": "industrie", "delta": 4, "verzoegerung_monate": 1},
        {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
    ],
}


def upgrade() -> None:
    conn = op.get_bind()

    # --- 9 neue Gesetze (id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, pfs, ke, kl, einn, pfl, inv, minc)
    gesetze_rows: list[tuple[Any, ...]] = [
        (
            "agrar_oekologie_programm",
            ["bund", "land", "eu"],
            52,
            -0.2,
            -0.5,
            -0.3,
            3,
            5,
            False,
            -30,
            -40,
            -25,
            "landwirtschaft",
            ["umwelt_energie"],
            -2.5,
            -0.8,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "agrar_subventionsabbau",
            ["bund", "eu"],
            48,
            0.1,
            0.2,
            0.2,
            2,
            4,
            False,
            55,
            10,
            35,
            "landwirtschaft",
            ["wirtschaft_finanzen"],
            0.0,
            0.0,
            1.5,
            0.0,
            False,
            2,
        ),
        (
            "agrar_tierhaltung_upgrade",
            ["bund", "land"],
            50,
            -0.1,
            -0.6,
            -0.2,
            4,
            5,
            False,
            -25,
            -45,
            20,
            "landwirtschaft",
            ["umwelt_energie"],
            -1.5,
            -1.2,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "agrar_premium_ausbau",
            ["bund", "land", "eu"],
            54,
            -0.2,
            -0.4,
            -0.2,
            4,
            5,
            False,
            -35,
            -25,
            -30,
            "landwirtschaft",
            ["wirtschaft_finanzen"],
            -3.0,
            -1.0,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "arbeit_tarifbindung_staerkung",
            ["bund"],
            53,
            -0.1,
            -0.2,
            -0.3,
            3,
            4,
            False,
            -40,
            -15,
            25,
            "arbeit_soziales",
            [],
            -0.5,
            -0.3,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "arbeit_qualifizierung_bafoeg",
            ["bund", "land"],
            55,
            -0.2,
            -0.3,
            -0.4,
            5,
            5,
            False,
            -25,
            -25,
            -40,
            "arbeit_soziales",
            ["bildung_forschung"],
            -3.0,
            -0.5,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "gesundheit_praevention_gesetz",
            ["bund", "land"],
            56,
            -0.2,
            -0.3,
            -0.3,
            5,
            5,
            False,
            -30,
            -20,
            -35,
            "gesundheit_pflege",
            [],
            -1.5,
            -1.2,
            0.0,
            0.0,
            False,
            2,
        ),
        (
            "gesundheit_krankenhaus_notlage",
            ["bund", "land"],
            52,
            -0.1,
            -0.5,
            -0.2,
            4,
            5,
            False,
            -15,
            -20,
            15,
            "gesundheit_pflege",
            [],
            -4.0,
            -2.0,
            0.0,
            0.0,
            True,
            2,
        ),
        (
            "verkehr_digital_ausbau",
            ["bund", "land", "kommunen"],
            55,
            -0.3,
            -0.2,
            -0.2,
            4,
            4,
            False,
            15,
            -10,
            40,
            "digital_infrastruktur",
            ["wirtschaft_finanzen"],
            -8.0,
            -0.5,
            0.0,
            0.0,
            True,
            2,
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

    # --- gesetze_i18n DE / EN ---
    i18n_de = [
        (
            "agrar_oekologie_programm",
            "Ökolandbau-Förder- und Umstellungsgesetz",
            "ÖLFU",
            "Bundesprogramm für ökologischen Landbau: Umstellungsprämien, Beratung und Marktöffnung für Bio-Produkte.",
        ),
        (
            "agrar_subventionsabbau",
            "Agrarsubventions-Abbaugesetz",
            "AgSub",
            "Schrittweiser Abbau marktverzerrender Direktzahlungen zugunsten wettbewerbsfähiger Strukturen.",
        ),
        (
            "agrar_tierhaltung_upgrade",
            "Tierhaltungs-Modernisierungsgesetz",
            "THM",
            "Höhere Standards in der Nutztierhaltung mit Übergangsfristen und Investitionshilfen für Betriebe.",
        ),
        (
            "agrar_premium_ausbau",
            "Agrarumweltprogramm-Ausbaugesetz",
            "AUP+",
            "Ausweitung von Agrarumweltprogrammen: Klima-, Gewässer- und Artenschutz auf der Fläche.",
        ),
        (
            "arbeit_tarifbindung_staerkung",
            "Tarifbindungs-Stärkungsgesetz",
            "TbStG",
            "Anreize für tarifgebundene Entgelte und kollektive Verhandlungen; mehr Fairness zwischen Branchen.",
        ),
        (
            "arbeit_qualifizierung_bafoeg",
            "Weiterbildungs-BAföG-Gesetz",
            "WBBG",
            "Förderung beruflicher Weiterbildung und Umschulung mit zinsgünstigen Zuschüssen und Darlehen.",
        ),
        (
            "gesundheit_praevention_gesetz",
            "Präventions- und Gesundheitsförderungsgesetz",
            "PrävG",
            "Ausbau Präventionsangebote, Impfaufklärung und Früherkennung in GKV und Kommunen.",
        ),
        (
            "gesundheit_krankenhaus_notlage",
            "Krankenhaus-Notlagenprogramm-Gesetz",
            "KnPG",
            "Sofortprogramm gegen Personalmangel und strukturelle Engpässe in der stationären Versorgung.",
        ),
        (
            "verkehr_digital_ausbau",
            "Digitales Verkehrsinfrastrukturprogramm",
            "DVIP",
            "Bund-Länder-Programm: intelligente Verkehrssteuerung, digitale Planungstools und E-Mobilität an Schnittstellen.",
        ),
    ]
    i18n_en = [
        (
            "agrar_oekologie_programm",
            "Organic Farming Transition and Support Act",
            "OFTA",
            "Federal programme for organic farming: transition premiums, advisory services and market access for organic products.",
        ),
        (
            "agrar_subventionsabbau",
            "Agricultural Subsidy Reduction Act",
            "AgSub",
            "Phased reduction of market-distorting direct payments in favour of competitive farm structures.",
        ),
        (
            "agrar_tierhaltung_upgrade",
            "Livestock Farming Modernisation Act",
            "LFMA",
            "Higher standards in livestock farming with transition periods and investment support for farms.",
        ),
        (
            "agrar_premium_ausbau",
            "Agri-Environmental Programme Expansion Act",
            "AEP+",
            "Expansion of agri-environmental schemes: climate, water and biodiversity on farmland.",
        ),
        (
            "arbeit_tarifbindung_staerkung",
            "Collective Bargaining Strengthening Act",
            "CBSA",
            "Incentives for tariff-bound pay and collective bargaining; more fairness across sectors.",
        ),
        (
            "arbeit_qualifizierung_bafoeg",
            "Continuing Education Student Aid Act",
            "CESA",
            "Support for vocational retraining and upskilling via grants and low-interest loans.",
        ),
        (
            "gesundheit_praevention_gesetz",
            "Prevention and Health Promotion Act",
            "PHPA",
            "Expanding prevention, vaccination information and early detection in statutory health care and municipalities.",
        ),
        (
            "gesundheit_krankenhaus_notlage",
            "Hospital Emergency Programme Act",
            "HEPA",
            "Emergency programme addressing staff shortages and structural strain in inpatient care.",
        ),
        (
            "verkehr_digital_ausbau",
            "Digital Transport Infrastructure Programme",
            "DTIP",
            "Federal-state programme: smart traffic management, digital planning tools and e-mobility interfaces.",
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

    # --- gesetz_relationen ---
    relationen = [
        (
            "agrar_subventionsabbau",
            "agrar_premium_ausbau",
            "excludes",
            "Subventionsabbau und massiver Ausbau der Agrarumweltprogramme widersprechen sich fiskalisch.",
            None,
        ),
        (
            "agrar_premium_ausbau",
            "agrar_subventionsabbau",
            "excludes",
            "Subventionsabbau und massiver Ausbau der Agrarumweltprogramme widersprechen sich fiskalisch.",
            None,
        ),
        (
            "agrar_tierhaltung_upgrade",
            "agrar_oekologie_programm",
            "enhances",
            "Tierhaltungsstandards und Ökolandbau-Förderung verstärken sich gegenseitig.",
            1.12,
        ),
        (
            "verkehr_digital_ausbau",
            "ki_foerder",
            "enhances",
            "Digitale Verkehrsinfrastruktur profitiert von KI-Förderung und Regulierung.",
            1.12,
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

    # --- Ministerial-Initiative (Umweltministerin Wolf) ---
    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen (id, char_id, gesetz_ref_id, trigger_type, min_complexity, cooldown_months)
            VALUES ('wolf_oekolandbau', 'gp_um', 'agrar_oekologie_programm', 'mood+event', 2, 8)
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
            VALUES (
                'wolf_oekolandbau', 'de',
                'Ökolandbau-Förderprogramm',
                'Wolf initiiert ein Programm für ökologischen Landbau und Klimaschutz auf der Fläche.',
                '„Wir brauchen eine Landwirtschaft, die Trägerin des Klimaschutzes wird.“'
            )
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
            VALUES (
                'wolf_oekolandbau', 'en',
                'Organic farming support programme',
                'Wolf initiates a programme for organic farming and on-farm climate protection.',
                '„We need agriculture as a driver of climate protection.“'
            )
        """),
    )

    # --- Kommunal-Initiative Agrar ---
    conn.execute(
        sa.text("""
            INSERT INTO events (
                id, event_type, politikfeld_id, min_complexity,
                trigger_druck_min, trigger_milieu_key, trigger_milieu_op, trigger_milieu_val, gesetz_ref
            )
            VALUES (
                'kommunal_agrar_initiative', 'kommunal_initiative', 'landwirtschaft', 2,
                65, 'buergerliche_mitte', '>', 55,
                CAST('{"agrar_oekologie_programm","agrar_premium_ausbau","agrar_tierhaltung_upgrade"}' AS text[])
            )
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES (
                'kommunal_agrar_initiative', 'de',
                'Kommunal-Initiative',
                'Landkreise fordern Agrarwende — kommunale Modellregionen',
                '„Ohne klare Bundesperspektive verlieren wir Hof und Fläche.“',
                'Mehrere strukturschwache Landkreise starten eigene Initiativen für nachhaltige Landwirtschaft. Die bürgerliche Mitte erwartet Führung aus Berlin.',
                'Landkreise: Agrar-Initiative — Bund unter Druck'
            )
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES (
                'kommunal_agrar_initiative', 'en',
                'Municipal initiative',
                'Rural districts demand agricultural transition — local model regions',
                '„Without a clear federal perspective we lose farms and land.“',
                'Several structurally weak districts launch initiatives for sustainable agriculture. Centrist voters expect leadership from Berlin.',
                'Rural districts: agricultural initiative — pressure on the federal government'
            )
        """),
    )

    max_id_result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    choice_id = int(max_id_result.scalar() or 0) + 1
    kommunal_choices = [
        (
            "kommunal_agrar_initiative",
            "als_vorbild",
            "safe",
            0,
            "Als Vorbild würdigen",
            "+2% BT-Stimmen für passende Gesetze, keine PK-Kosten.",
            "Kommunale Agrar-Initiative als Vorbild gewürdigt.",
            "Recognise as a model",
            "+2% Bundestag votes for matching laws, no PK cost.",
            "Municipal agricultural initiative recognised as a model.",
        ),
        (
            "kommunal_agrar_initiative",
            "koordinieren",
            "primary",
            8,
            "Koordinieren und Pilot starten",
            "8 PK — voller Kommunal-Pilot mit dem passenden Gesetz.",
            "Bund koordiniert kommunale Agrar-Initiative. Pilotprojekt gestartet.",
            "Coordinate and start pilot",
            "8 PK — full municipal pilot with the matching law.",
            "Federal government coordinates municipal agricultural initiative. Pilot started.",
        ),
        (
            "kommunal_agrar_initiative",
            "ignorieren",
            "danger",
            0,
            "Ignorieren",
            "Keine Reaktion. Druck könnte steigen.",
            "Kommunale Agrar-Initiative ignoriert.",
            "Ignore",
            "No reaction. Pressure may rise.",
            "Municipal agricultural initiative ignored.",
        ),
    ]
    for (
        event_id,
        ckey,
        ctype,
        cost,
        label_de,
        desc_de,
        log_de,
        label_en,
        desc_en,
        log_en,
    ) in kommunal_choices:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf)
                VALUES (:id, :event_id, :choice_key, :choice_type, :cost, 0, 0, 0, 0)
            """),
            {
                "id": choice_id,
                "event_id": event_id,
                "choice_key": ckey,
                "choice_type": ctype,
                "cost": cost,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label_de, "desc": desc_de, "log_msg": log_de},
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label_en, "desc": desc_en, "log_msg": log_en},
        )
        choice_id += 1

    conn.execute(sa.text("SELECT setval('event_choices_id_seq', :mx)"), {"mx": choice_id - 1})

    # --- EU reaktive Richtlinie Agrar ---
    conn.execute(
        sa.text("""
            INSERT INTO eu_events (id, event_type, politikfeld_id, trigger_klima_min, trigger_monat, min_complexity)
            VALUES ('eu_rl_agrar_nachhaltigkeit', 'reaktiv_richtlinie', 'landwirtschaft', 60, NULL, 3)
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO eu_events_i18n (event_id, locale, title, quote, context, ticker)
            VALUES (
                'eu_rl_agrar_nachhaltigkeit', 'de',
                'EU-Agrar-Nachhaltigkeitsrichtlinie',
                '„Brüssel verschärft ökologische Mindeststandards für Direktzahlungen.“',
                'Die EU verlangt strengere Nachhaltigkeitskriterien für Agrarförderung. Nationale Umsetzung erforderlich.',
                'EU verschärft Agrar-Nachhaltigkeitsregeln — Umsetzung in Deutschland'
            )
        """),
    )
    conn.execute(
        sa.text("""
            INSERT INTO eu_events_i18n (event_id, locale, title, quote, context, ticker)
            VALUES (
                'eu_rl_agrar_nachhaltigkeit', 'en',
                'EU agricultural sustainability directive',
                '„Brussels tightens ecological minimum standards for direct payments.“',
                'The EU demands stricter sustainability criteria for farm support. National implementation is required.',
                'EU tightens agricultural sustainability rules — implementation in Germany'
            )
        """),
    )

    max_eu = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM eu_event_choices"))
    eu_choice_id = int(max_eu.scalar() or 0) + 1
    eu_choices = [
        (
            "eu_rl_agrar_nachhaltigkeit",
            "sofort_umsetzen",
            0,
            0,
            0,
            0,
            0,
            0,
            0.25,
            "Sofort umsetzen",
            "Vollständige Umsetzung. Kofinanzierung 25%, höhere ökologische Wirkung.",
            "EU-Agrar-Nachhaltigkeitsrichtlinie vollständig umgesetzt.",
        ),
        (
            "eu_rl_agrar_nachhaltigkeit",
            "minimal_umsetzen",
            0,
            0,
            0,
            0,
            0,
            0,
            0.12,
            "Minimal umsetzen",
            "Minimale Umsetzung, Wirkung reduziert. Kofinanzierung 12%.",
            "EU-Agrar-Nachhaltigkeitsrichtlinie minimal umgesetzt.",
        ),
        (
            "eu_rl_agrar_nachhaltigkeit",
            "klagen",
            0,
            0,
            0,
            0,
            0,
            0,
            0.0,
            "Klagen",
            "12 Monate Aufschub, 30% Erfolgschance.",
            "Klage gegen EU-Agrar-Nachhaltigkeitsrichtlinie eingereicht.",
        ),
    ]
    for (
        event_id,
        ckey,
        cost,
        ea,
        eh,
        eg,
        ez,
        euk,
        kof,
        label,
        desc,
        log,
    ) in eu_choices:
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices (
                    id, event_id, choice_key, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    eu_klima_delta, kofinanzierung
                )
                VALUES (:id, :event_id, :choice_key, :cost, :ea, :eh, :eg, :ez, :euk, :kof)
            """),
            {
                "id": eu_choice_id,
                "event_id": event_id,
                "choice_key": ckey,
                "cost": cost,
                "ea": ea,
                "eh": eh,
                "eg": eg,
                "ez": ez,
                "euk": euk,
                "kof": kof,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": eu_choice_id, "label": label, "desc": desc, "log_msg": log},
        )
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log_msg)
            """),
            {
                "id": eu_choice_id,
                "label": (
                    "Implement fully"
                    if ckey == "sofort_umsetzen"
                    else ("Minimal implementation" if ckey == "minimal_umsetzen" else "Litigate")
                ),
                "desc": (
                    "Full implementation. Co-financing 25%, stronger ecological impact."
                    if ckey == "sofort_umsetzen"
                    else (
                        "Minimal implementation, reduced effect. Co-financing 12%."
                        if ckey == "minimal_umsetzen"
                        else "12 months delay, 30% success chance."
                    )
                ),
                "log_msg": (
                    "EU agricultural sustainability directive fully implemented."
                    if ckey == "sofort_umsetzen"
                    else (
                        "EU agricultural sustainability directive minimally implemented."
                        if ckey == "minimal_umsetzen"
                        else "Lawsuit filed against EU agricultural sustainability directive."
                    )
                ),
            },
        )
        eu_choice_id += 1

    conn.execute(
        sa.text("SELECT setval('eu_event_choices_id_seq', :mx)"), {"mx": eu_choice_id - 1}
    )

    # --- Reklassifikation: Stadtentwicklung → Digital + Wirtschaft sekundär ---
    conn.execute(
        sa.text("""
            UPDATE gesetze
            SET politikfeld_id = 'digital_infrastruktur',
                politikfeld_sekundaer = ARRAY['wirtschaft_finanzen']::text[]
            WHERE id = 'stadtentwicklung'
        """),
    )
    conn.execute(
        sa.text("""
            UPDATE gesetze SET sektor_effekte = CAST(:j AS jsonb)
            WHERE id = 'stadtentwicklung'
        """),
        {"j": json.dumps(SEKTOR_BY_PF["digital_infrastruktur"])},
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text("""
            UPDATE gesetze
            SET politikfeld_id = 'wirtschaft_finanzen',
                politikfeld_sekundaer = '{}'::text[]
            WHERE id = 'stadtentwicklung'
        """),
    )
    conn.execute(
        sa.text("""
            UPDATE gesetze SET sektor_effekte = CAST(:j AS jsonb)
            WHERE id = 'stadtentwicklung'
        """),
        {"j": json.dumps(SEKTOR_BY_PF["wirtschaft_finanzen"])},
    )

    eid_eu = "eu_rl_agrar_nachhaltigkeit"
    conn.execute(
        sa.text("""
            DELETE FROM eu_event_choices_i18n WHERE choice_id IN (
                SELECT id FROM eu_event_choices WHERE event_id = :eid
            )
        """),
        {"eid": eid_eu},
    )
    conn.execute(
        sa.text("DELETE FROM eu_event_choices WHERE event_id = :eid"), {"eid": eid_eu}
    )
    conn.execute(
        sa.text("DELETE FROM eu_events_i18n WHERE event_id = :eid"), {"eid": eid_eu}
    )
    conn.execute(sa.text("DELETE FROM eu_events WHERE id = :eid"), {"eid": eid_eu})

    eid_k = "kommunal_agrar_initiative"
    conn.execute(
        sa.text("""
            DELETE FROM event_choices_i18n WHERE choice_id IN (
                SELECT id FROM event_choices WHERE event_id = :eid
            )
        """),
        {"eid": eid_k},
    )
    conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid_k})
    conn.execute(
        sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid_k}
    )
    conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid_k})

    conn.execute(
        sa.text("DELETE FROM ministerial_initiativen_i18n WHERE initiative_id = 'wolf_oekolandbau'")
    )
    conn.execute(sa.text("DELETE FROM ministerial_initiativen WHERE id = 'wolf_oekolandbau'"))

    new_law_ids = [
        "agrar_oekologie_programm",
        "agrar_subventionsabbau",
        "agrar_tierhaltung_upgrade",
        "agrar_premium_ausbau",
        "arbeit_tarifbindung_staerkung",
        "arbeit_qualifizierung_bafoeg",
        "gesundheit_praevention_gesetz",
        "gesundheit_krankenhaus_notlage",
        "verkehr_digital_ausbau",
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
