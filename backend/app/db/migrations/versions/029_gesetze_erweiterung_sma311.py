"""SMA-311: 12 neue Gesetze — politische Richtungen & Themenbereiche

Revision ID: 029_gesetze_erweiterung
Revises: 028_spargesetze
Create Date: 2026-03-18

12 neue Gesetze:
- Umwelt & Energie: Verbraucherschutz, Tierschutz, Naturschutz
- Konservativ (CDP/LDP): Polizei, Migration, Deregulierung, Privatisierung, Familienpolitik
- Links/Progressiv (SDP/GP/LP): Mietrecht, 4-Tage-Woche, Grundeinkommen
- Bildung & Forschung: Bildungsfreiheit, KI-Forschung
"""

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "029_gesetze_erweiterung"
down_revision: Union[str, Sequence[str], None] = "028_spargesetze"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed 12 neue Gesetze mit Framing-Optionen (milieu/verband Effekte)."""
    conn = op.get_bind()

    # --- 12 neue Gesetze ---
    # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, pfl, inv, minc
    gesetze_data = [
        # Verbraucherschutz (digital_infrastruktur)
        (
            "verbraucherschutz_digital",
            ["bund", "eu"],
            52,
            0,
            -0.5,
            -0.2,
            3,
            4,
            False,
            -20,
            -30,
            -20,
            "digital_infrastruktur",
            0.0,
            -0.5,
            0.0,
            0.0,
            False,
            1,
        ),
        # Tierschutz
        (
            "tierschutzgesetz_reform",
            ["bund", "land"],
            50,
            0,
            -0.8,
            -0.3,
            4,
            5,
            False,
            -25,
            -50,
            -15,
            "umwelt_energie",
            0.0,
            -0.8,
            0.0,
            0.0,
            False,
            1,
        ),
        # Naturschutz
        (
            "naturschutz_renaturierung",
            ["bund", "land", "eu"],
            48,
            -0.1,
            -0.5,
            -0.3,
            4,
            6,
            False,
            -35,
            -55,
            -10,
            "umwelt_energie",
            -3.0,
            -0.5,
            0.0,
            0.0,
            True,
            1,
        ),
        # Polizei (konservativ)
        (
            "polizei_ausstattung",
            ["bund"],
            54,
            0,
            -0.2,
            0,
            3,
            5,
            False,
            10,
            50,
            30,
            "innere_sicherheit",
            -2.0,
            -3.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # Migration (konservativ)
        (
            "migrationsbegrenzung",
            ["bund", "eu"],
            51,
            0,
            -0.1,
            0,
            2,
            4,
            False,
            15,
            70,
            40,
            "innere_sicherheit",
            0.0,
            -1.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # Deregulierung (liberal)
        (
            "deregulierung_gewerbe",
            ["bund"],
            53,
            -0.1,
            0,
            0.2,
            2,
            3,
            False,
            65,
            10,
            55,
            "wirtschaft_finanzen",
            0.0,
            0.0,
            1.5,
            0.0,
            False,
            1,
        ),
        # Privatisierung (liberal)
        (
            "privatisierung_infrastruktur",
            ["bund"],
            48,
            0,
            0.2,
            0.3,
            2,
            6,
            False,
            75,
            20,
            70,
            "digital_infrastruktur",
            -15.0,
            0.0,
            2.0,
            0.0,
            False,
            1,
        ),
        # Familienpolitik (konservativ)
        (
            "familienpolitik_klassisch",
            ["bund"],
            55,
            -0.2,
            -0.4,
            -0.2,
            5,
            5,
            False,
            10,
            45,
            10,
            "gesundheit_pflege",
            0.0,
            -4.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # Mietrecht (links)
        (
            "mietpreisbremse_verschaerfung",
            ["bund", "land"],
            55,
            0,
            -0.1,
            -0.8,
            5,
            5,
            False,
            -55,
            -20,
            -40,
            "arbeit_soziales",
            0.0,
            -1.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # 4-Tage-Woche (links)
        (
            "viertagewoche",
            ["bund"],
            48,
            0,
            -0.15,
            -0.5,
            4,
            4,
            False,
            -50,
            -40,
            -30,
            "arbeit_soziales",
            -1.5,
            0.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # Grundeinkommen (links)
        (
            "grundeinkommen_modell",
            ["bund"],
            52,
            -0.4,
            -0.3,
            -0.6,
            2,
            6,
            False,
            -70,
            -50,
            -60,
            "arbeit_soziales",
            -2.0,
            -3.0,
            0.0,
            0.0,
            False,
            3,
        ),
        # Bildungsfreiheit (links)
        (
            "schulgeld_abschaffung",
            ["bund", "land"],
            56,
            -0.2,
            -0.3,
            -0.8,
            6,
            5,
            False,
            -40,
            -35,
            -30,
            "bildung_forschung",
            0.0,
            -3.0,
            0.0,
            0.0,
            False,
            1,
        ),
        # KI-Forschung (neutral)
        (
            "forschungsfoerderung_ki",
            ["bund", "eu"],
            58,
            -0.5,
            -0.2,
            0.1,
            4,
            5,
            False,
            10,
            -10,
            -10,
            "bildung_forschung",
            -5.0,
            -2.0,
            0.0,
            0.0,
            True,
            1,
        ),
    ]

    for (
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
        ke,
        kl,
        einn,
        pfl,
        inv,
        minc,
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, pflichtausgaben_delta,
                    investiv, min_complexity)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    :ke, :kl, :einn, :pfl, :inv, :minc)
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
                "ke": ke,
                "kl": kl,
                "einn": einn,
                "pfl": pfl,
                "inv": inv,
                "minc": minc,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        (
            "verbraucherschutz_digital",
            "Digitales Verbraucherschutzgesetz",
            "VerbrSchG",
            "Stärkung der Verbraucherrechte bei digitalen Produkten, Abo-Fallen und Dark Patterns.",
        ),
        (
            "tierschutzgesetz_reform",
            "Tierschutzgesetz-Reform",
            "TierSchG",
            "Verschärfung der Tierschutzstandards in der Landwirtschaft und im Handel.",
        ),
        (
            "naturschutz_renaturierung",
            "Renaturierungsgesetz",
            "RenaturG",
            "Wiederherstellung natürlicher Ökosysteme — Moore, Auen, Wälder — gemäß EU-Vorgaben.",
        ),
        (
            "polizei_ausstattung",
            "Polizeiausstattungs- und Personalgesetz",
            "PolAusstG",
            "Aufstockung der Bundespolizei um 10.000 Stellen und Modernisierung der Ausstattung.",
        ),
        (
            "migrationsbegrenzung",
            "Migrationssteuerungsgesetz",
            "MigrSteuG",
            "Verschärfung der Einwanderungsregeln und beschleunigte Rückführungsverfahren.",
        ),
        (
            "deregulierung_gewerbe",
            "Gewerbederegulierungsgesetz",
            "GewDeregG",
            "Abbau von Genehmigungspflichten und Beschleunigung von Betriebsanmeldungen.",
        ),
        (
            "privatisierung_infrastruktur",
            "Infrastruktur-Privatisierungsgesetz",
            "InfraPrivG",
            "Öffnung staatlicher Infrastruktur für private Investoren — Autobahnen, Bahn, Energie.",
        ),
        (
            "familienpolitik_klassisch",
            "Familienstärkungsgesetz",
            "FamStärkG",
            "Erhöhung des Kindergeldes, Ausbau der Eheförderung und steuerliche Entlastung für Familien.",
        ),
        (
            "mietpreisbremse_verschaerfung",
            "Mietrecht-Reformgesetz",
            "MietRefG",
            "Verschärfung der Mietpreisbremse und Einführung eines bundesweiten Mietendeckels.",
        ),
        (
            "viertagewoche",
            "4-Tage-Woche-Pilotgesetz",
            "4TageWG",
            "Staatlich gefördertes Pilotprogramm zur Einführung der 4-Tage-Woche in Unternehmen.",
        ),
        (
            "grundeinkommen_modell",
            "Grundeinkommens-Modellprojekt",
            "GrundeinkMod",
            "Bundesweites Pilotprojekt zum bedingungslosen Grundeinkommen für 10.000 Haushalte.",
        ),
        (
            "schulgeld_abschaffung",
            "Bildungsfreiheitsgesetz",
            "BildFreiG",
            "Abschaffung aller Studiengebühren und Einführung kostenloser Nachhilfe für Bedürftige.",
        ),
        (
            "forschungsfoerderung_ki",
            "KI-Forschungsoffensive",
            "KIForschOff",
            "Verdopplung der staatlichen KI-Forschungsförderung und Aufbau nationaler KI-Zentren.",
        ),
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
        (
            "verbraucherschutz_digital",
            "Digital Consumer Protection Act",
            "DCPA",
            "Strengthening consumer rights for digital products, subscription traps and dark patterns.",
        ),
        (
            "tierschutzgesetz_reform",
            "Animal Welfare Act Reform",
            "AWAR",
            "Tightening animal welfare standards in agriculture and trade.",
        ),
        (
            "naturschutz_renaturierung",
            "Renaturation Act",
            "RenatA",
            "Restoration of natural ecosystems — wetlands, floodplains, forests — in line with EU requirements.",
        ),
        (
            "polizei_ausstattung",
            "Police Equipment and Personnel Act",
            "PEPA",
            "Expansion of federal police by 10,000 positions and modernization of equipment.",
        ),
        (
            "migrationsbegrenzung",
            "Migration Control Act",
            "MCA",
            "Tightening immigration rules and accelerated return procedures.",
        ),
        (
            "deregulierung_gewerbe",
            "Trade Deregulation Act",
            "TDA",
            "Reduction of licensing requirements and acceleration of business registration.",
        ),
        (
            "privatisierung_infrastruktur",
            "Infrastructure Privatization Act",
            "IPA",
            "Opening state infrastructure to private investors — motorways, rail, energy.",
        ),
        (
            "familienpolitik_klassisch",
            "Family Strengthening Act",
            "FSA",
            "Increase in child benefit, expansion of marriage support and tax relief for families.",
        ),
        (
            "mietpreisbremse_verschaerfung",
            "Rental Law Reform Act",
            "RLA",
            "Tightening of rent caps and introduction of nationwide rent ceiling.",
        ),
        (
            "viertagewoche",
            "4-Day Week Pilot Act",
            "4DWA",
            "State-funded pilot program for the introduction of the 4-day week in companies.",
        ),
        (
            "grundeinkommen_modell",
            "Basic Income Pilot Project",
            "BIPP",
            "Nationwide pilot project for unconditional basic income for 10,000 households.",
        ),
        (
            "schulgeld_abschaffung",
            "Education Freedom Act",
            "EFA",
            "Abolition of all tuition fees and introduction of free tutoring for those in need.",
        ),
        (
            "forschungsfoerderung_ki",
            "AI Research Offensive",
            "AIRO",
            "Doubling of public AI research funding and establishment of national AI centers.",
        ),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- Framing-Optionen (milieu_effekte, verband_effekte, medienklima_delta) ---
    framing_data = {
        "verbraucherschutz_digital": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "soziale_mitte": 4,
                    "buergerliche_mitte": 3,
                    "leistungstraeger": -2,
                },
                "verband_effekte": {"bdi": -6, "dwv": -5, "gbd": 8},
                "medienklima_delta": 1,
            },
        ],
        "tierschutzgesetz_reform": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "postmaterielle": 7,
                    "soziale_mitte": 4,
                    "traditionelle": -3,
                },
                "verband_effekte": {"uvb": 10, "bvl": -12},
                "medienklima_delta": 2,
            },
        ],
        "naturschutz_renaturierung": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "postmaterielle": 8,
                    "traditionelle": -4,
                    "buergerliche_mitte": 2,
                },
                "verband_effekte": {"uvb": 12, "bvl": -8},
                "medienklima_delta": 2,
            },
        ],
        "polizei_ausstattung": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "traditionelle": 7,
                    "buergerliche_mitte": 5,
                    "etablierte": 4,
                    "postmaterielle": -5,
                },
                "verband_effekte": {"sgd": 15, "uvb": -5},
                "medienklima_delta": 0,
            },
        ],
        "migrationsbegrenzung": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "traditionelle": 8,
                    "prekaere": 3,
                    "postmaterielle": -10,
                    "soziale_mitte": -3,
                },
                "verband_effekte": {"sgd": 8, "bdi": -5},
                "medienklima_delta": -1,
            },
        ],
        "deregulierung_gewerbe": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "leistungstraeger": 6,
                    "etablierte": 5,
                    "prekaere": -2,
                },
                "verband_effekte": {"bdi": 12, "dwv": 8, "gbd": -6},
                "medienklima_delta": 1,
            },
        ],
        "privatisierung_infrastruktur": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "etablierte": 6,
                    "leistungstraeger": 4,
                    "prekaere": -7,
                    "soziale_mitte": -5,
                },
                "verband_effekte": {"bdi": 15, "dwv": 10, "gbd": -12},
                "medienklima_delta": -1,
            },
        ],
        "familienpolitik_klassisch": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "traditionelle": 8,
                    "buergerliche_mitte": 6,
                    "postmaterielle": -4,
                },
                "verband_effekte": {"gbd": 5, "bdi": 3},
                "medienklima_delta": 1,
            },
        ],
        "mietpreisbremse_verschaerfung": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "prekaere": 8,
                    "soziale_mitte": 6,
                    "etablierte": -7,
                    "leistungstraeger": -4,
                },
                "verband_effekte": {"gbd": 10, "bdi": -8},
                "medienklima_delta": 1,
            },
        ],
        "viertagewoche": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "postmaterielle": 8,
                    "soziale_mitte": 5,
                    "prekaere": 4,
                    "leistungstraeger": -3,
                    "etablierte": -5,
                },
                "verband_effekte": {"gbd": 12, "bdi": -10},
                "medienklima_delta": 1,
            },
        ],
        "grundeinkommen_modell": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "prekaere": 10,
                    "postmaterielle": 7,
                    "soziale_mitte": 4,
                    "etablierte": -8,
                    "leistungstraeger": -5,
                },
                "verband_effekte": {"gbd": 15, "bdi": -12},
                "medienklima_delta": 2,
            },
        ],
        "schulgeld_abschaffung": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "prekaere": 7,
                    "soziale_mitte": 5,
                    "postmaterielle": 4,
                    "etablierte": -2,
                },
                "verband_effekte": {"bvd": 12, "gbd": 8},
                "medienklima_delta": 1,
            },
        ],
        "forschungsfoerderung_ki": [
            {
                "key": "standard",
                "milieu_effekte": {
                    "leistungstraeger": 5,
                    "postmaterielle": 4,
                    "etablierte": 3,
                },
                "verband_effekte": {"bdi": 8, "dwv": 12, "bvd": 10},
                "medienklima_delta": 2,
            },
        ],
    }

    for gesetz_id, optionen in framing_data.items():
        json_val = json.dumps(optionen)
        conn.execute(
            sa.text(
                "UPDATE gesetze SET framing_optionen = CAST(:opt AS jsonb) WHERE id = :gid"
            ),
            {"opt": json_val, "gid": gesetz_id},
        )


def downgrade() -> None:
    """Remove 12 neue Gesetze."""
    conn = op.get_bind()
    new_ids = [
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
    ]
    for gid in new_ids:
        conn.execute(
            sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid}
        )
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})
