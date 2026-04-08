"""Hilfsskript: einmalige Daten für SMA-501 Langzeitwirkungen (nicht zur Laufzeit importiert)."""

from __future__ import annotations

import json
import re
from pathlib import Path


def collect_gesetz_ids() -> list[str]:
    root = Path(__file__).resolve().parents[1] / "app" / "db" / "migrations" / "versions"
    ids: list[str] = []
    for path in sorted(root.glob("*.py")):
        text = path.read_text(encoding="utf-8")
        if "gesetze_rows" not in text and "INSERT INTO gesetze" not in text:
            continue
        for m in re.finditer(r'\(\s*\n\s*"([a-z0-9_]+)",\s*\n\s*\[', text):
            ids.append(m.group(1))
    seen: set[str] = set()
    unique: list[str] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            unique.append(i)
    return unique


def theme(gid: str) -> tuple[int, list[str], list[str]]:
    g = gid.lower()
    pos_d = [
        "Dauerhafte Verankerung der Politiklinie in Gesetz und Verwaltungspraxis.",
        "Signalwirkung für Investitionen, Planungssicherheit und internationale Wettbewerbsfähigkeit.",
    ]
    neg_d = [
        "Langfristige Folgekosten oder Bürokratie, die später nachjustiert werden müssen.",
        "Verteilungs- und Interessenkonflikte verschieben sich nur zeitlich, lösen sich nicht auf.",
    ]
    score = 4
    pos, neg = pos_d, neg_d
    if any(
        x in g
        for x in (
            "klima",
            "strom",
            "offshore",
            "energie",
            "waerme",
            "wasserstoff",
            "kreislauf",
            "tier",
            "natur",
            "oeko",
            "epa",
        )
    ):
        score = 7
        pos = [
            "Beschleunigter Klimaschutz und Technologiepfad für Dekarbonisierung.",
            "EU-Anbindung und Finanzierungsrahmen für grüne Infrastruktur.",
        ]
        neg = [
            "Industriestandorte und Energiepreise bleiben langfristig unter Druck.",
            "Akzeptanzrisiken, wenn Umstellung zu schnell oder ungleich verteilt wirkt.",
        ]
    elif any(
        x in g
        for x in (
            "steuer",
            "est_",
            "mwst",
            "co2",
            "vermoegen",
            "digitalsteuer",
            "spitzen",
            "koerp",
            "einnahm",
        )
    ):
        score = 6
        pos = [
            "Nachhaltigere Einnahmebasis und Spielräume für Prioritäten im Haushalt.",
            "Klarere Anreize für Arbeit, Konsum oder Klimaschutz je nach Ausgestaltung.",
        ]
        neg = [
            "Wettbewerbsnachteile oder Steuerarbitrage mit Nachbarstaaten möglich.",
            "Umgehungsgeschäfte und Lobbydruck auf Folgegesetze nehmen zu.",
        ]
    elif any(
        x in g
        for x in (
            "schulden",
            "spar",
            "pflichtausgaben",
            "beamten",
            "subvention",
            "rente_stab",
            "effizienz",
        )
    ):
        score = 5
        pos = [
            "Haushaltsdisziplin und langfristige Tragfähigkeit der öffentlichen Finanzen.",
            "Politische Handlungsspielräume in späteren Jahren werden gewahrt.",
        ]
        neg = [
            "Investitions- und Soziallücken, wenn Einsparungen nicht kompensiert werden.",
            "Konjunkturelle Dämpfung bei zu früh zu scharfen Kürzungen.",
        ]
    elif any(
        x in g
        for x in (
            "sozial",
            "pflege",
            "gkv",
            "mindestlohn",
            "grundeinkommen",
            "viertag",
            "tarif",
            "arbeit",
            "qualifizierung",
            "ausbildung",
        )
    ):
        score = 6
        pos = [
            "Stärkere Absicherung und Teilhabe am Arbeitsmarkt über Jahre.",
            "Fachkräfte- und Produktivitätseffekte durch Qualifizierung und faire Löhne.",
        ]
        neg = [
            "Lohnnebenkosten und Wirtschaftlichkeit kleiner Betriebe steigen dauerhaft.",
            "Fiskalische Belastung, wenn keine Gegenfinanzierung folgt.",
        ]
    elif any(x in g for x in ("digital", "cyber", "ki_", "plattform", "daten", "verwaltungsdigital", "breitband")):
        score = 5
        pos = [
            "Digitale Souveränität, IT-Sicherheit und moderne Verwaltungsabläufe.",
            "Innovationsimpulse für Wirtschaft und Verwaltung.",
        ]
        neg = [
            "Implementierungskosten und Fachkräftemangel bremsen die Wirkung.",
            "Datenschutz- und Bürokratiekonflikte verschärfen sich bei schlechter Umsetzung.",
        ]
    elif any(
        x in g
        for x in (
            "miet",
            "wohn",
            "oepnv",
            "ticket",
            "schienen",
            "verkehr",
            "stadt",
            "kita",
            "kommunal",
            "gemeinde",
            "nahverkehr",
        )
    ):
        score = 5
        pos = [
            "Mehr bezahlbarer Wohnraum und bessere Mobilität in Städten und Regionen.",
            "Kommunale Handlungsfähigkeit und Planungssicherheit steigen.",
        ]
        neg = [
            "Finanzierungslücken bei Ländern und Kommunen bleiben strukturell.",
            "NIMBY-Konflikte und Genehmigungsdauer untergraben die Ziele.",
        ]
    elif any(
        x in g
        for x in (
            "bundeswehr",
            "ausland",
            "grenz",
            "schengen",
            "polizei",
            "sicherheit",
            "migration",
            "verfassung",
            "grundrecht",
        )
    ):
        score = 7
        pos = [
            "Klare rechtliche und sicherheitspolitische Rahmenbedingungen.",
            "Bündnisfähigkeit und Schutz kritischer Infrastruktur.",
        ]
        neg = [
            "Grundrechts- und Föderalismusdebatten ziehen sich über Jahre.",
            "Außen- und Integrationspolitik wird zum Dauerbrenner in der Öffentlichkeit.",
        ]
    elif any(x in g for x in ("agrar", "bauern", "landwirtschaft", "tierwohl")):
        score = 5
        pos = [
            "Ökologischer Umbau der Landwirtschaft und fairere Wettbewerbsbedingungen.",
            "Tierwohl und Verbrauchertransparenz langfristig verbessert.",
        ]
        neg = [
            "Einkommenseinbrüche in strukturschwachen Agrarregionen.",
            "Importkonkurrenz und Handelskonflikte mit Partnerstaaten.",
        ]
    elif "eu" in g:
        score = 5
        pos = [
            "Harmonisierung mit EU-Recht und Zugang zu Förder- und Binnenmarktvorteilen.",
            "Rechtssicherheit für Unternehmen in grenzüberschreitenden Prozessen.",
        ]
        neg = [
            "Umsetzungsfristen und nationale Sonderwege erzeugen Reibung.",
            "Überregulierung und Klagekultur können Innovation bremsen.",
        ]
    return score, pos[:2], neg[:2]


def build_langzeit_updates() -> list[tuple[str, int, list[str], list[str]]]:
    return [(gid, *theme(gid)) for gid in collect_gesetz_ids()]


def write_migration(path: Path) -> None:
    rows = build_langzeit_updates()
    agenda_seed_ids = [r["id"] for r in _agenda_seed_rows()]
    kziel_seed_ids = [r["id"] for r in _koalition_seed_rows()]
    lines: list[str] = [
        '"""SMA-501: Seed Agenda-Ziele, Koalitionsziele, Langzeitwirkungen Gesetze.',
        "",
        "Revision ID: 058_sma501_agenda_koalition_seed",
        "Revises: 057_sma500_agenda_koalition_langzeit",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "import json",
        "from typing import Sequence, Union",
        "",
        "import sqlalchemy as sa",
        "from alembic import op",
        "",
        'revision: str = "058_sma501_agenda_koalition_seed"',
        'down_revision: Union[str, Sequence[str], None] = "057_sma500_agenda_koalition_langzeit"',
        "branch_labels: Union[str, Sequence[str], None] = None",
        "depends_on: Union[str, Sequence[str], None] = None",
        "",
        "",
        "def upgrade() -> None:",
        "    conn = op.get_bind()",
        "",
        "    agenda = [",
    ]
    for r in _agenda_seed_rows():
        lines.append(f"        {repr(r)},")
    lines += [
        "    ]",
        "    for z in agenda:",
        "        conn.execute(",
        "            sa.text(",
        '                """',
        "                INSERT INTO agenda_ziele (",
        "                    id, kategorie, schwierigkeit, partei_filter, min_complexity,",
        "                    bedingung_typ, bedingung_param",
        "                ) VALUES (",
        "                    :id, :kat, :schw, CAST(:pf AS jsonb), :mc, :bt, CAST(:bp AS jsonb)",
        "                )",
        '                """',
        "            ),",
        "            {",
        '                "id": z["id"],',
        '                "kat": z["kategorie"],',
        '                "schw": z["schwierigkeit"],',
        '                "pf": json.dumps(z.get("partei_filter")),',
        '                "mc": z["min_complexity"],',
        '                "bt": z["bedingung_typ"],',
        '                "bp": json.dumps(z["bedingung_param"]),',
        "            },",
        "        )",
        "        conn.execute(",
        "            sa.text(",
        '                """',
        "                INSERT INTO agenda_ziele_i18n (agenda_ziel_id, locale, titel, beschreibung)",
        "                VALUES (:id, 'de', :titel, :besch)",
        '                """',
        "            ),",
        "            {\"id\": z[\"id\"], \"titel\": z[\"titel_de\"], \"besch\": z[\"beschreibung_de\"]},",
        "        )",
        "",
        "    kziele = [",
    ]
    for r in _koalition_seed_rows():
        lines.append(f"        {repr(r)},")
    lines += [
        "    ]",
        "    for z in kziele:",
        "        conn.execute(",
        "            sa.text(",
        '                """',
        "                INSERT INTO koalitions_ziele (",
        "                    id, partner_profil, kategorie, min_complexity,",
        "                    bedingung_typ, bedingung_param, beziehung_malus",
        "                ) VALUES (",
        "                    :id, :pp, :kat, :mc, :bt, CAST(:bp AS jsonb), :bm",
        "                )",
        '                """',
        "            ),",
        "            {",
        '                "id": z["id"],',
        '                "pp": z["partner_profil"],',
        '                "kat": z["kategorie"],',
        '                "mc": z["min_complexity"],',
        '                "bt": z["bedingung_typ"],',
        '                "bp": json.dumps(z["bedingung_param"]),',
        '                "bm": z["beziehung_malus"],',
        "            },",
        "        )",
        "        conn.execute(",
        "            sa.text(",
        '                """',
        "                INSERT INTO koalitions_ziele_i18n",
        "                    (koalitions_ziel_id, locale, titel, beschreibung)",
        "                VALUES (:id, 'de', :titel, :besch)",
        '                """',
        "            ),",
        "            {\"id\": z[\"id\"], \"titel\": z[\"titel_de\"], \"besch\": z[\"beschreibung_de\"]},",
        "        )",
        "",
        "    for gid, score, pos, neg in [",
    ]
    for gid, sc, pos, neg in rows:
        lines.append("        (")
        lines.append(f'            "{gid}",')
        lines.append(f"            {sc},")
        lines.append(f"            {json.dumps(pos, ensure_ascii=False)},")
        lines.append(f"            {json.dumps(neg, ensure_ascii=False)},")
        lines.append("        ),")
    lines += [
        "    ]:",
        "        conn.execute(",
        "            sa.text(",
        '                """',
        "                UPDATE gesetze SET",
        "                    langzeit_score = :sc,",
        "                    langzeitwirkung_positiv_de = CAST(:pos AS text[]),",
        "                    langzeitwirkung_negativ_de = CAST(:neg AS text[])",
        "                WHERE id = :gid",
        '                """',
        "            ),",
        "            {",
        '                "gid": gid,',
        '                "sc": score,',
        '                "pos": "{" + ",".join(json.dumps(p) for p in pos) + "}",',
        '                "neg": "{" + ",".join(json.dumps(n) for n in neg) + "}",',
        "            },",
        "        )",
        "",
        "",
        "def downgrade() -> None:",
        "    conn = op.get_bind()",
        f"    k_ids = {kziel_seed_ids!r}",
        f"    a_ids = {agenda_seed_ids!r}",
        "    for kid in k_ids:",
        "        conn.execute(",
        "            sa.text(",
        '                "DELETE FROM koalitions_ziele_i18n WHERE koalitions_ziel_id = :id AND locale = \'de\'"',
        "            ),",
        "            {\"id\": kid},",
        "        )",
        "    for kid in k_ids:",
        "        conn.execute(sa.text(\"DELETE FROM koalitions_ziele WHERE id = :id\"), {\"id\": kid})",
        "    for aid in a_ids:",
        "        conn.execute(",
        "            sa.text(",
        '                "DELETE FROM agenda_ziele_i18n WHERE agenda_ziel_id = :id AND locale = \'de\'"',
        "            ),",
        "            {\"id\": aid},",
        "        )",
        "    for aid in a_ids:",
        "        conn.execute(sa.text(\"DELETE FROM agenda_ziele WHERE id = :id\"), {\"id\": aid})",
        "    g_ids = [",
    ]
    for gid, _sc, _pos, _neg in rows:
        lines.append(f'        "{gid}",')
    lines += [
        "    ]",
        "    for gid in g_ids:",
        "        conn.execute(",
        "            sa.text(",
        '                "UPDATE gesetze SET langzeit_score = 0, langzeitwirkung_positiv_de = \'{}\', langzeitwirkung_negativ_de = \'{}\' WHERE id = :gid"',
        "            ),",
        "            {\"gid\": gid},",
        "        )",
    ]

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _agenda_seed_rows() -> list[dict[str, object]]:
    """12 Spieler-Agenda-Ziele (DE-Texte in *_de Keys)."""
    return [
        {
            "id": "ag_gesetz_klimawende",
            "kategorie": "gesetzgebung",
            "schwierigkeit": 3,
            "partei_filter": ["sdp", "gp", "lp"],
            "min_complexity": 1,
            "bedingung_typ": "gesetz_politikfeld",
            "bedingung_param": {"politikfeld_id": "umwelt_energie", "min_beschlossen": 2},
            "titel_de": "Klimawende voranbringen",
            "beschreibung_de": "Mindestens zwei Gesetze aus dem Politikfeld Umwelt & Energie erfolgreich beschließen.",
        },
        {
            "id": "ag_gesetz_wirtschaftsstandort",
            "kategorie": "gesetzgebung",
            "schwierigkeit": 3,
            "partei_filter": ["cdp", "ldp"],
            "min_complexity": 1,
            "bedingung_typ": "gesetz_politikfeld",
            "bedingung_param": {"politikfeld_id": "wirtschaft_finanzen", "min_beschlossen": 2},
            "titel_de": "Wirtschaftsstandort stärken",
            "beschreibung_de": "Mindestens zwei Gesetze aus Wirtschaft & Finanzen beschließen.",
        },
        {
            "id": "ag_gesetz_breit_regieren",
            "kategorie": "gesetzgebung",
            "schwierigkeit": 2,
            "partei_filter": None,
            "min_complexity": 1,
            "bedingung_typ": "gesetz_anzahl_beschlossen",
            "bedingung_param": {"min_beschlossen": 5},
            "titel_de": "Breit regieren",
            "beschreibung_de": "Fünf beliebige Gesetze in der Legislatur erfolgreich verabschieden.",
        },
        {
            "id": "ag_milieu_prekaere",
            "kategorie": "milieu",
            "schwierigkeit": 3,
            "partei_filter": ["sdp", "gp", "lp"],
            "min_complexity": 2,
            "bedingung_typ": "milieu_zustimmung_min",
            "bedingung_param": {"milieu_id": "prekaere", "min_pct": 42},
            "titel_de": "Prekäre erreichen",
            "beschreibung_de": "Milieu „Prekäre“ mindestens auf 42 % Zustimmung halten oder erreichen.",
        },
        {
            "id": "ag_milieu_mitte",
            "kategorie": "milieu",
            "schwierigkeit": 2,
            "partei_filter": None,
            "min_complexity": 1,
            "bedingung_typ": "milieu_zustimmung_min",
            "bedingung_param": {"milieu_id": "soziale_mitte", "min_pct": 48},
            "titel_de": "Mitte halten",
            "beschreibung_de": "Die soziale Mitte stabil bei mindestens 48 % Zustimmung halten.",
        },
        {
            "id": "ag_medien_praesenz",
            "kategorie": "medien",
            "schwierigkeit": 2,
            "partei_filter": None,
            "min_complexity": 2,
            "bedingung_typ": "medienklima_monate_min",
            "bedingung_param": {"schwelle": 55, "min_monate": 24},
            "titel_de": "Medienpräsenz",
            "beschreibung_de": "In mindestens 24 Monaten ein Medienklima von über 55 halten.",
        },
        {
            "id": "ag_medien_krisenfest",
            "kategorie": "medien",
            "schwierigkeit": 3,
            "partei_filter": None,
            "min_complexity": 2,
            "bedingung_typ": "medienklima_monate_max_unter",
            "bedingung_param": {"schwelle": 35, "max_monate": 6},
            "titel_de": "Krisenfest in der Öffentlichkeit",
            "beschreibung_de": "Höchstens sechs Monate mit Medienklima unter 35.",
        },
        {
            "id": "ag_verband_gewerkschaften",
            "kategorie": "verbaende",
            "schwierigkeit": 2,
            "partei_filter": ["sdp", "gp", "lp"],
            "min_complexity": 1,
            "bedingung_typ": "verband_beziehung_min",
            "bedingung_param": {"verband_id": "gbd", "min_beziehung": 60},
            "titel_de": "Gewerkschaften an Bord",
            "beschreibung_de": "Beziehung zum GBD mindestens 60 halten.",
        },
        {
            "id": "ag_verband_wirtschaft",
            "kategorie": "verbaende",
            "schwierigkeit": 2,
            "partei_filter": ["cdp", "ldp"],
            "min_complexity": 1,
            "bedingung_typ": "verband_beziehung_min",
            "bedingung_param": {"verband_id": "bdi", "min_beziehung": 58},
            "titel_de": "Wirtschaftsverbände binden",
            "beschreibung_de": "Beziehung zum BDI mindestens 58 halten.",
        },
        {
            "id": "ag_haushalt_schwarze_null",
            "kategorie": "haushalt",
            "schwierigkeit": 4,
            "partei_filter": ["cdp", "ldp"],
            "min_complexity": 2,
            "bedingung_typ": "haushalt_saldo_min",
            "bedingung_param": {"min_saldo_mrd": 0.0, "min_monate_am_stueck": 12},
            "titel_de": "Schwarze Null",
            "beschreibung_de": "Mindestens zwölf Monate in Folge einen nicht negativen Haushaltssaldo (≥ 0 Mrd. €).",
        },
        {
            "id": "ag_haushalt_investition",
            "kategorie": "haushalt",
            "schwierigkeit": 3,
            "partei_filter": ["sdp", "gp", "lp"],
            "min_complexity": 2,
            "bedingung_typ": "gesetz_investiv_beschlossen",
            "bedingung_param": {"min_beschlossen": 3},
            "titel_de": "Investitionsoffensive",
            "beschreibung_de": "Drei als investiv markierte Gesetze erfolgreich beschließen.",
        },
        {
            "id": "ag_kabinett_zusammenhalt",
            "kategorie": "kabinett",
            "schwierigkeit": 3,
            "partei_filter": None,
            "min_complexity": 2,
            "bedingung_typ": "char_mood_min_durchschnitt",
            "bedingung_param": {"min_avg_mood": 3.0},
            "titel_de": "Kabinettszusammenhalt",
            "beschreibung_de": "Durchschnittliche Stimmung aller Kabinettsmitglieder mindestens 3,0 halten.",
        },
    ]


def _koalition_seed_rows() -> list[dict[str, object]]:
    return [
        {
            "id": "kz_gp_umweltgesetz",
            "partner_profil": "gp",
            "kategorie": "gesetzgebung",
            "min_complexity": 1,
            "bedingung_typ": "gesetz_politikfeld",
            "bedingung_param": {"politikfeld_id": "umwelt_energie", "min_beschlossen": 1},
            "beziehung_malus": 8,
            "titel_de": "Grüne: klares Umweltgesetz",
            "beschreibung_de": "Mindestens ein Gesetz aus Umwelt & Energie muss beschlossen werden — sonst wächst der Druck aus der Koalition.",
        },
        {
            "id": "kz_gp_postmateriell",
            "partner_profil": "gp",
            "kategorie": "milieu",
            "min_complexity": 1,
            "bedingung_typ": "milieu_zustimmung_min",
            "bedingung_param": {"milieu_id": "postmaterielle", "min_pct": 45},
            "beziehung_malus": 6,
            "titel_de": "Postmaterielles Milieu",
            "beschreibung_de": "Die postmaterielle Zustimmung soll mindestens 45 % nicht unterschreiten.",
        },
        {
            "id": "kz_gp_uvb",
            "partner_profil": "gp",
            "kategorie": "verbaende",
            "min_complexity": 1,
            "bedingung_typ": "verband_beziehung_min",
            "bedingung_param": {"verband_id": "uvb", "min_beziehung": 50},
            "beziehung_malus": 5,
            "titel_de": "UVB nicht verprellen",
            "beschreibung_de": "Beziehung zum Umweltverband (UVB) mindestens bei 50 halten.",
        },
        {
            "id": "kz_sdp_sozialgesetz",
            "partner_profil": "sdp",
            "kategorie": "gesetzgebung",
            "min_complexity": 1,
            "bedingung_typ": "gesetz_politikfeld",
            "bedingung_param": {"politikfeld_id": "arbeit_soziales", "min_beschlossen": 1},
            "beziehung_malus": 8,
            "titel_de": "SPD: Sozialpolitisches Signal",
            "beschreibung_de": "Mindestens ein Gesetz aus Arbeit & Soziales muss beschlossen werden.",
        },
        {
            "id": "kz_sdp_soziale_mitte",
            "partner_profil": "sdp",
            "kategorie": "milieu",
            "min_complexity": 1,
            "bedingung_typ": "milieu_zustimmung_min",
            "bedingung_param": {"milieu_id": "soziale_mitte", "min_pct": 45},
            "beziehung_malus": 6,
            "titel_de": "Soziale Mitte sichern",
            "beschreibung_de": "Zustimmung der sozialen Mitte mindestens 45 %.",
        },
        {
            "id": "kz_sdp_gbd",
            "partner_profil": "sdp",
            "kategorie": "verbaende",
            "min_complexity": 1,
            "bedingung_typ": "verband_beziehung_min",
            "bedingung_param": {"verband_id": "gbd", "min_beziehung": 50},
            "beziehung_malus": 5,
            "titel_de": "Gewerkschafts-Vertrauen",
            "beschreibung_de": "Beziehung zum GBD mindestens 50 halten.",
        },
    ]


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "app/db/migrations/versions/058_sma501_agenda_koalition_seed.py"
    write_migration(out)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
