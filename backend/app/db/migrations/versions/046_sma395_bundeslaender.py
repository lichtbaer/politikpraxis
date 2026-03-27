"""SMA-395: Bundesländer-Profile (Tabelle + Seed) + länderspezifische Bundesrat-Events.

Revision ID: 046_sma395_bundeslaender
Revises: 045_event_choice_dynamic_extras_sma394
Create Date: 2026-03-26
"""

from __future__ import annotations

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

revision: str = "046_sma395_bundeslaender"
down_revision: Union[str, Sequence[str], None] = "045_event_choice_dynamic_extras_sma394"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bundeslaender",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name_de", sa.Text(), nullable=False),
        sa.Column("partei", sa.Text(), nullable=True),
        sa.Column("koalition", ARRAY(sa.Text()), nullable=False),
        sa.Column("bundesrat_fraktion", sa.Text(), nullable=False),
        sa.Column(
            "wirtschaft_typ",
            sa.Text(),
            nullable=False,
        ),
        sa.Column("themen", ARRAY(sa.Text()), nullable=False),
        sa.Column("beziehung_start", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("stimmgewicht", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("min_complexity", sa.Integer(), nullable=False, server_default="2"),
    )
    op.create_check_constraint(
        "ck_bundeslaender_wirtschaft_typ",
        "bundeslaender",
        "wirtschaft_typ IN ('stark','mittel','schwach')",
    )
    op.create_check_constraint(
        "ck_bundeslaender_bundesrat_fraktion",
        "bundeslaender",
        "bundesrat_fraktion IN ('union','spd_gruene','fdp','gemischt')",
    )

    conn = op.get_bind()

    laender_rows = [
        (
            "BY",
            "Bayern",
            "CDP",
            ["CDP", "LDP"],
            "union",
            "stark",
            [
                "wirtschaft_finanzen",
                "landwirtschaft",
                "eu_skepsis",
                "industrie",
            ],
            52,
            6,
        ),
        (
            "NW",
            "Nordrhein-Westfalen",
            "SDP",
            ["SDP", "GP"],
            "spd_gruene",
            "mittel",
            ["strukturwandel", "energie", "arbeit_soziales", "industrie"],
            50,
            6,
        ),
        (
            "BW",
            "Baden-Württemberg",
            "GP",
            ["GP", "SDP"],
            "spd_gruene",
            "stark",
            ["umwelt_energie", "digital_infrastruktur", "wirtschaft_finanzen"],
            48,
            6,
        ),
        (
            "NI",
            "Niedersachsen",
            "SDP",
            ["SDP", "GP"],
            "spd_gruene",
            "mittel",
            ["landwirtschaft", "energie", "arbeit_soziales"],
            55,
            6,
        ),
        (
            "HE",
            "Hessen",
            "CDP",
            ["CDP", "GP"],
            "union",
            "stark",
            ["wirtschaft_finanzen", "innere_sicherheit", "digital_infrastruktur"],
            45,
            5,
        ),
        (
            "HH",
            "Hamburg",
            "SDP",
            ["SDP", "GP"],
            "spd_gruene",
            "stark",
            ["digital_infrastruktur", "arbeit_soziales", "wirtschaft_finanzen"],
            58,
            3,
        ),
        (
            "HB",
            "Bremen",
            "SDP",
            ["SDP", "LDP"],
            "spd_gruene",
            "mittel",
            ["arbeit_soziales", "digital_infrastruktur"],
            56,
            3,
        ),
        (
            "BE",
            "Berlin",
            "SDP",
            ["SDP", "LP", "GP"],
            "spd_gruene",
            "stark",
            ["digital_infrastruktur", "arbeit_soziales", "umwelt_energie"],
            50,
            4,
        ),
        (
            "SH",
            "Schleswig-Holstein",
            "CDP",
            ["CDP", "GP"],
            "gemischt",
            "mittel",
            ["umwelt_energie", "arbeit_soziales", "digital_infrastruktur"],
            48,
            4,
        ),
        (
            "SL",
            "Saarland",
            "SDP",
            ["SDP"],
            "spd_gruene",
            "schwach",
            ["strukturwandel", "wirtschaft_finanzen", "arbeit_soziales"],
            50,
            3,
        ),
        (
            "RP",
            "Rheinland-Pfalz",
            "SDP",
            ["SDP", "GP"],
            "spd_gruene",
            "mittel",
            ["landwirtschaft", "wirtschaft_finanzen", "energie"],
            52,
            4,
        ),
        (
            "BB",
            "Brandenburg",
            "SDP",
            ["SDP", "CDP"],
            "spd_gruene",
            "schwach",
            ["strukturwandel", "arbeit_soziales", "energie"],
            46,
            4,
        ),
        (
            "SN",
            "Sachsen",
            "CDP",
            ["CDP"],
            "union",
            "schwach",
            ["strukturwandel", "migration", "abhaengung", "wirtschaft_finanzen"],
            42,
            4,
        ),
        (
            "TH",
            "Thüringen",
            "LP",
            ["LP", "SDP"],
            "spd_gruene",
            "schwach",
            ["strukturwandel", "migration", "abhaengung"],
            44,
            4,
        ),
        (
            "MV",
            "Mecklenburg-Vorpommern",
            "SDP",
            ["SDP", "CDP"],
            "spd_gruene",
            "schwach",
            ["strukturwandel", "arbeit_soziales", "energie"],
            48,
            3,
        ),
        (
            "ST",
            "Sachsen-Anhalt",
            "CDP",
            ["CDP", "SDP"],
            "gemischt",
            "schwach",
            ["strukturwandel", "wirtschaft_finanzen", "arbeit_soziales"],
            45,
            4,
        ),
    ]

    for row in laender_rows:
        conn.execute(
            sa.text("""
                INSERT INTO bundeslaender (
                    id, name_de, partei, koalition, bundesrat_fraktion,
                    wirtschaft_typ, themen, beziehung_start, stimmgewicht, min_complexity
                ) VALUES (
                    :id, :name_de, :partei, :koalition, :br_f,
                    :wtyp, :themen, :bez, :stim, 2
                )
            """),
            {
                "id": row[0],
                "name_de": row[1],
                "partei": row[2],
                "koalition": row[3],
                "br_f": row[4],
                "wtyp": row[5],
                "themen": row[6],
                "bez": row[7],
                "stim": row[8],
            },
        )

    # --- Bundesrat-Events (Stufe 3+, Logik im Frontend) ---
    events = [
        (
            "bayern_umwelt_konflikt",
            "bundesrat",
            3,
            "Konflikt",
            "Bayern droht mit Bundesrat-Blockade",
            "„So nicht.“",
            "Die bayerische Staatsregierung kündigt an, das jüngste Umweltgesetz im Bundesrat zu blockieren — mit Verweis auf Wirtschaft und Landwirtschaft.",
            "Bayern: Drohung mit Bundesratsblockade nach Umweltgesetz.",
        ),
        (
            "nrw_strukturwandel",
            "bundesrat",
            3,
            "Länder",
            "NRW fordert Strukturwandel-Milliarden",
            "„Der Kohleausstieg kostet.“",
            "Nordrhein-Westfalen beantragt zusätzliche Bundesmittel für den Strukturwandel in den Revieren.",
            "NRW fordert Bundesmittel für Strukturwandel.",
        ),
        (
            "ostlaender_abhaengung",
            "bundesrat",
            3,
            "Ost",
            "Ostländer fordern Sonderprogramm",
            "„Wir brauchen Perspektive.“",
            "Sachsen, Sachsen-Anhalt, Thüringen und Mecklenburg-Vorpommern warnen vor wirtschaftlicher Abhängigkeit und fordern ein gemeinsames Ost-Programm.",
            "Ostländer fordern ein Sonderprogramm.",
        ),
    ]
    op.add_column(
        "event_choices",
        sa.Column("br_relation_json", JSONB(), nullable=True),
    )

    for eid, etype, min_c, tlabel, title, quote, context, ticker in events:
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, min_complexity)
                VALUES (:id, :etype, :min_c)
            """),
            {"id": eid, "etype": etype, "min_c": min_c},
        )
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (
                    event_id, locale, type_label, title, quote, context, ticker
                ) VALUES (
                    :id, 'de', :tlabel, :title, :quote, :context, :ticker
                )
            """),
            {
                "id": eid,
                "tlabel": tlabel,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    def ins_choice(
        eid: str,
        key: str,
        ctype: str,
        cost: int,
        eff: dict,
        label: str,
        desc: str,
        log: str,
        *,
        kpd: int | None = None,
        mk: int | None = None,
        br_bonus: int | None = None,
        milieu: dict | None = None,
        br_rel: dict[str, int] | None = None,
    ) -> None:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (
                    event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    char_mood, loyalty,
                    koalitionspartner_beziehung_delta, medienklima_delta,
                    bundesrat_bonus, milieu_delta, br_relation_json
                ) VALUES (
                    :eid, :key, :ctype, :cost,
                    :al, :hh, :gi, :zf,
                    CAST(:cm AS jsonb), CAST(:ly AS jsonb),
                    :kpd, :mk, :brb, CAST(:md AS jsonb), CAST(:brj AS jsonb)
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
                "cm": "{}",
                "ly": "{}",
                "kpd": kpd,
                "mk": mk,
                "brb": br_bonus,
                "md": json.dumps(milieu) if milieu else "{}",
                "brj": json.dumps(br_rel) if br_rel else "{}",
            },
        )
        r = conn.execute(
            sa.text(
                "SELECT id FROM event_choices WHERE event_id = :eid AND choice_key = :key ORDER BY id DESC LIMIT 1"
            ),
            {"eid": eid, "key": key},
        )
        cid = r.scalar_one()
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:cid, 'de', :label, :desc, :log)
            """),
            {"cid": cid, "label": label, "desc": desc, "log": log},
        )

    # Bayern — brRelation über spezielle Keys (Frontend mappt auf Fraktionen)
    ins_choice(
        "bayern_umwelt_konflikt",
        "verhandeln",
        "primary",
        15,
        {},
        "Sondergespräch mit Bayern",
        "Hoher PK-Einsatz, aber die Union im Bundesrat beruhigt sich.",
        "Sondierungsgespräch mit Bayern: Union +10 Beziehung.",
        br_rel={"konservativer_block": 10},
    )
    ins_choice(
        "bayern_umwelt_konflikt",
        "ignorieren",
        "danger",
        0,
        {},
        "Blockade riskieren",
        "Ihr lehnt bilaterale Gespräche ab — der konservative Block kühlt ab.",
        "Bayern-Konflikt ignoriert: konservativer Block −5 Beziehung.",
        br_rel={"konservativer_block": -5},
    )
    ins_choice(
        "bayern_umwelt_konflikt",
        "kompromiss",
        "safe",
        0,
        {},
        "Gesetz anpassen",
        "Leichte Abschwächung der Wirkung, dafür Entspannung in München.",
        "Kompromiss mit Bayern: Gesetzeswirkung abgeschwächt, konservativer Block +8.",
        mk=-2,
        br_rel={"konservativer_block": 8},
    )

    ins_choice(
        "nrw_strukturwandel",
        "zusagen",
        "primary",
        10,
        {"hh": -8},
        "Mittel zusagen",
        "8 Mrd. zusätzliche Belastung — die SPD-Länder danken es euch.",
        "Strukturhilfe für NRW zugesagt: Haushalt −8 Mrd., SPD-Länder +15.",
        br_rel={"koalitionstreue": 15, "pragmatische_mitte": 15},
    )
    ins_choice(
        "nrw_strukturwandel",
        "verzoegern",
        "safe",
        0,
        {},
        "Prüfung ankündigen",
        "Kein sofortiger Saldo-Effekt, aber Unmut in Düsseldorf.",
        "NRW-Forderung vertagt: SPD-Länder −5 Beziehung.",
        mk=-2,
        br_rel={"koalitionstreue": -5, "pragmatische_mitte": -5},
    )
    ins_choice(
        "nrw_strukturwandel",
        "ablehnen",
        "danger",
        0,
        {},
        "Ablehnen",
        "Klare Kante — riskant für Medien und NRW.",
        "NRW-Forderung abgelehnt: SPD-Länder −15, Medienklima −5.",
        mk=-5,
        br_rel={"koalitionstreue": -15, "pragmatische_mitte": -15},
    )

    ins_choice(
        "ostlaender_abhaengung",
        "programm",
        "primary",
        12,
        {"hh": -6},
        "Ostförderung (6 Mrd.)",
        "Teuer, aber alle Bundesratsfraktionen spüren Entlastung.",
        "Ostprogramm beschlossen: Haushalt −6 Mrd., alle BR-Fraktionen +10.",
        br_bonus=10,
    )
    ins_choice(
        "ostlaender_abhaengung",
        "ablehnen",
        "danger",
        0,
        {},
        "Ablehnen",
        "Spart Geld, verärgert Medien und prekäre Milieus.",
        "Ostprogramm abgelehnt: Medienklima −8, prekäre Milieus −5.",
        mk=-8,
        milieu={"prekaere": -5},
    )

    rmax = conn.execute(sa.text("SELECT MAX(id) FROM event_choices")).scalar()
    if rmax:
        conn.execute(
            sa.text("SELECT setval('event_choices_id_seq', :mx)"),
            {"mx": rmax},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for eid in (
        "bayern_umwelt_konflikt",
        "nrw_strukturwandel",
        "ostlaender_abhaengung",
    ):
        conn.execute(
            sa.text(
                "DELETE FROM event_choices_i18n WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)"
            ),
            {"eid": eid},
        )
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    op.drop_column("event_choices", "br_relation_json")
    op.drop_table("bundeslaender")
