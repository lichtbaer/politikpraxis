"""#475: Agenda-Ziele relativ zum Start + nur auswertbare Ziele je Stufe.

Drei Probleme mit den Halte-Zielen aus 058 (``milieu_zustimmung_min``,
``verband_beziehung_min``):

1. **Zum Start erfüllt:** Die absoluten Schwellen liegen unter den Startwerten
   (z. B. ``ag_milieu_mitte`` ≥ 48 bei Start ~52, ``kz_gp_uvb`` ≥ 50 bei Start 60).
   Wer sie wählte, hatte sie ohne Zutun erfüllt.
2. **Auf der Stufe nicht auswertbar:** Stufe 1 hat keine Milieu-Werte
   (``milieus_voll`` ab Stufe 2), dort las „Mitte halten“ 0 und war nur über ein
   Wahlkampf-Event in Monat 44 erfüllbar. Das Milieu „Prekäre“ gibt es erst ab
   Stufe 3, das Ziel war ab Stufe 2 wählbar. Verbandsbeziehungen ändern sich auf
   Stufe 1 gar nicht; der erste direkte Hebel (Verbandsgespräch) kommt auf Stufe 3.
3. **Parteiabhängig:** Startwerte hängen von Partei und Ausrichtung ab (GBD 60–70),
   eine absolute Schwelle ist je nach Partei geschenkt oder kaum erreichbar.

Neu:

- Bedingungstypen ``milieu_zustimmung_steigern`` / ``verband_beziehung_steigern``
  mit ``min_delta``: erfüllt, wenn der Wert am Legislaturende mindestens
  Startwert + ``min_delta`` beträgt (Startwerte: ``GameState.agendaStartwerte``).
- Milieuziele ab Stufe 2 (``prekaere`` ab 3), Verbandsziele ab Stufe 3.
- Drei neue Gesetzesziele ab Stufe 1, damit dort jede Partei eine Wahl hat.

Revision ID: 074_agenda_ziele_relativ
Revises: 073_kabinett_stufe1
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "074_agenda_ziele_relativ"
down_revision: Union[str, Sequence[str], None] = "073_kabinett_stufe1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Kalibriert mit der Balance-Simulation (#475): Punkte über dem Startwert.
# Milieus steigen schon ohne Zutun (Drift zur Segmentzustimmung): passiv im Median
# +6…+10 bis Monat 48, aktives Gesetzgeben +20…+28. Bei +10 verfehlt passives und
# zufälliges Spiel das Ziel meist, gutes Spiel erreicht es zu > 90 %. Verbände sinken
# ab Stufe 3 ohne Pflege um ~5; +10 heißt also drei bis vier Verbandsgespräche.
MILIEU_DELTA = 10
VERBAND_DELTA = 10

_M = "milieu_zustimmung_steigern"
_V = "verband_beziehung_steigern"


def _milieu_text(name_de: str, name_en: str) -> tuple[str, str]:
    return (
        f"Die Zustimmung {name_de} bis zum Ende der Legislatur um mindestens "
        f"{MILIEU_DELTA} Punkte gegenüber dem Start steigern.",
        f"Raise approval of {name_en} by at least {MILIEU_DELTA} points over "
        "its starting value by the end of the term.",
    )


def _verband_text(name_de: str, name_en: str) -> tuple[str, str]:
    return (
        f"Die Beziehung zum {name_de} bis zum Ende der Legislatur um mindestens "
        f"{VERBAND_DELTA} Punkte gegenüber dem Start verbessern.",
        f"Improve the relationship with the {name_en} by at least "
        f"{VERBAND_DELTA} points over its starting value by the end of the term.",
    )


# (id, tabelle, min_complexity, bedingung_typ, bedingung_param, titel_de, titel_en,
#  beschreibung_de, beschreibung_en)
_UMSTELLUNG: list[tuple[str, str, int, str, dict[str, Any], str, str, str, str]] = [
    (
        "ag_milieu_mitte",
        "agenda",
        2,
        _M,
        {"milieu_id": "soziale_mitte", "min_delta": MILIEU_DELTA},
        "Soziale Mitte gewinnen",
        "Win over the social centre",
        *_milieu_text("der sozialen Mitte", "the social centre"),
    ),
    (
        "ag_milieu_prekaere",
        "agenda",
        3,
        _M,
        {"milieu_id": "prekaere", "min_delta": MILIEU_DELTA},
        "Prekäre erreichen",
        "Reach the precarious",
        *_milieu_text("des Milieus „Prekäre“", "the 'Precarious' milieu"),
    ),
    (
        "ag_verband_gewerkschaften",
        "agenda",
        3,
        _V,
        {"verband_id": "gbd", "min_delta": VERBAND_DELTA},
        "Gewerkschaften gewinnen",
        "Win over the unions",
        *_verband_text("GBD", "GBD"),
    ),
    (
        "ag_verband_wirtschaft",
        "agenda",
        3,
        _V,
        {"verband_id": "bdi", "min_delta": VERBAND_DELTA},
        "Wirtschaftsverbände binden",
        "Bind business associations",
        *_verband_text("BDI", "BDI"),
    ),
    (
        "kz_gp_postmateriell",
        "koalition",
        2,
        _M,
        {"milieu_id": "postmaterielle", "min_delta": MILIEU_DELTA},
        "Postmaterielles Milieu gewinnen",
        "Win the post-material milieu",
        *_milieu_text("des postmateriellen Milieus", "the post-material milieu"),
    ),
    (
        "kz_gp_uvb",
        "koalition",
        3,
        _V,
        {"verband_id": "uvb", "min_delta": VERBAND_DELTA},
        "Umweltverband gewinnen",
        "Win over the environmental association",
        *_verband_text("Umweltverband (UVB)", "environmental association (UVB)"),
    ),
    (
        "kz_sdp_gbd",
        "koalition",
        3,
        _V,
        {"verband_id": "gbd", "min_delta": VERBAND_DELTA},
        "Gewerkschafts-Vertrauen stärken",
        "Strengthen union trust",
        *_verband_text("GBD", "GBD"),
    ),
    (
        "kz_sdp_soziale_mitte",
        "koalition",
        2,
        _M,
        {"milieu_id": "soziale_mitte", "min_delta": MILIEU_DELTA},
        "Soziale Mitte stärken",
        "Strengthen the social centre",
        *_milieu_text("der sozialen Mitte", "the social centre"),
    ),
]

# Stand vor dieser Migration (058/059) — für downgrade().
_ALT: dict[str, tuple[int, str, dict[str, Any], str, str, str, str]] = {
    "ag_milieu_mitte": (
        1,
        "milieu_zustimmung_min",
        {"milieu_id": "soziale_mitte", "min_pct": 48},
        "Mitte halten",
        "Hold the centre",
        "Die soziale Mitte stabil bei mindestens 48 % Zustimmung halten.",
        "Keep social centre stable at at least 48% approval.",
    ),
    "ag_milieu_prekaere": (
        2,
        "milieu_zustimmung_min",
        {"milieu_id": "prekaere", "min_pct": 42},
        "Prekäre erreichen",
        "Reach the precarious",
        "Milieu „Prekäre“ mindestens auf 42 % Zustimmung halten oder erreichen.",
        "Keep or reach milieu 'Precarious' at at least 42% approval.",
    ),
    "ag_verband_gewerkschaften": (
        1,
        "verband_beziehung_min",
        {"verband_id": "gbd", "min_beziehung": 60},
        "Gewerkschaften an Bord",
        "Unions on board",
        "Beziehung zum GBD mindestens 60 halten.",
        "Keep GBD relationship at at least 60.",
    ),
    "ag_verband_wirtschaft": (
        1,
        "verband_beziehung_min",
        {"verband_id": "bdi", "min_beziehung": 58},
        "Wirtschaftsverbände binden",
        "Bind business associations",
        "Beziehung zum BDI mindestens 58 halten.",
        "Keep BDI relationship at at least 58.",
    ),
    "kz_gp_postmateriell": (
        1,
        "milieu_zustimmung_min",
        {"milieu_id": "postmaterielle", "min_pct": 45},
        "Postmaterielles Milieu",
        "Post-material milieu",
        "Die postmaterielle Zustimmung soll mindestens 45 % nicht unterschreiten.",
        "Post-material approval should not fall below 45%.",
    ),
    "kz_gp_uvb": (
        1,
        "verband_beziehung_min",
        {"verband_id": "uvb", "min_beziehung": 50},
        "UVB nicht verprellen",
        "Do not alienate UVB",
        "Beziehung zum Umweltverband (UVB) mindestens bei 50 halten.",
        "Keep relationship with environmental association (UVB) at at least 50.",
    ),
    "kz_sdp_gbd": (
        1,
        "verband_beziehung_min",
        {"verband_id": "gbd", "min_beziehung": 50},
        "Gewerkschafts-Vertrauen",
        "Union trust",
        "Beziehung zum GBD mindestens 50 halten.",
        "Keep GBD relationship at at least 50.",
    ),
    "kz_sdp_soziale_mitte": (
        1,
        "milieu_zustimmung_min",
        {"milieu_id": "soziale_mitte", "min_pct": 45},
        "Soziale Mitte sichern",
        "Secure social centre",
        "Zustimmung der sozialen Mitte mindestens 45 %.",
        "Social centre approval at least 45%.",
    ),
}

# Neue Gesetzesziele ab Stufe 1:
# (id, schwierigkeit, partei_filter, politikfeld_id, titel_de, titel_en,
#  beschreibung_de, beschreibung_en)
_NEU: list[tuple[str, int, list[str] | None, str, str, str, str, str]] = [
    (
        "ag_gesetz_sozialstaat",
        3,
        ["sdp", "gp", "lp"],
        "arbeit_soziales",
        "Sozialstaat stärken",
        "Strengthen the welfare state",
        "Mindestens zwei Gesetze aus Arbeit & Soziales erfolgreich beschließen.",
        "Pass at least two laws from Labour & Social Affairs successfully.",
    ),
    (
        "ag_gesetz_sicherheit",
        3,
        ["cdp", "ldp"],
        "innere_sicherheit",
        "Rechtsstaat und Sicherheit",
        "Rule of law and security",
        "Mindestens zwei Gesetze aus Innere Sicherheit erfolgreich beschließen.",
        "Pass at least two laws from Internal Security successfully.",
    ),
    (
        "ag_gesetz_digital",
        3,
        None,
        "digital_infrastruktur",
        "Digitaler Aufbruch",
        "Digital push",
        "Mindestens zwei Gesetze aus Digital & Infrastruktur erfolgreich beschließen.",
        "Pass at least two laws from Digital & Infrastructure successfully.",
    ),
]

# Statische SQL-Texte je Tabelle (keine String-Interpolation in SQL).
_SQL_ZIEL = {
    "agenda": sa.text(
        "UPDATE agenda_ziele SET min_complexity = :mc, bedingung_typ = :bt, "
        "bedingung_param = CAST(:bp AS jsonb) WHERE id = :id"
    ),
    "koalition": sa.text(
        "UPDATE koalitions_ziele SET min_complexity = :mc, bedingung_typ = :bt, "
        "bedingung_param = CAST(:bp AS jsonb) WHERE id = :id"
    ),
}
_SQL_TEXT = {
    "agenda": sa.text(
        "UPDATE agenda_ziele_i18n SET titel = :titel, beschreibung = :besch "
        "WHERE agenda_ziel_id = :id AND locale = CAST(:loc AS content_locale)"
    ),
    "koalition": sa.text(
        "UPDATE koalitions_ziele_i18n SET titel = :titel, beschreibung = :besch "
        "WHERE koalitions_ziel_id = :id AND locale = CAST(:loc AS content_locale)"
    ),
}


def _setze(
    conn: sa.Connection,
    tabelle: str,
    zid: str,
    mc: int,
    bt: str,
    bp: dict[str, Any],
    texte: tuple[str, str, str, str],
) -> None:
    conn.execute(
        _SQL_ZIEL[tabelle], {"id": zid, "mc": mc, "bt": bt, "bp": json.dumps(bp)}
    )
    titel_de, titel_en, besch_de, besch_en = texte
    for loc, titel, besch in (("de", titel_de, besch_de), ("en", titel_en, besch_en)):
        conn.execute(
            _SQL_TEXT[tabelle], {"id": zid, "loc": loc, "titel": titel, "besch": besch}
        )


def upgrade() -> None:
    conn = op.get_bind()
    for zid, tabelle, mc, bt, bp, t_de, t_en, b_de, b_en in _UMSTELLUNG:
        _setze(conn, tabelle, zid, mc, bt, bp, (t_de, t_en, b_de, b_en))

    for zid, schw, pf, feld, t_de, t_en, b_de, b_en in _NEU:
        conn.execute(
            sa.text(
                """
                INSERT INTO agenda_ziele (
                    id, kategorie, schwierigkeit, partei_filter, min_complexity,
                    bedingung_typ, bedingung_param
                ) VALUES (
                    :id, 'gesetzgebung', :schw, CAST(:pf AS jsonb), 1,
                    'gesetz_politikfeld', CAST(:bp AS jsonb)
                )
                """
            ),
            {
                "id": zid,
                "schw": schw,
                "pf": json.dumps(pf),
                "bp": json.dumps({"politikfeld_id": feld, "min_beschlossen": 2}),
            },
        )
        for loc, titel, besch in (("de", t_de, b_de), ("en", t_en, b_en)):
            conn.execute(
                sa.text(
                    """
                    INSERT INTO agenda_ziele_i18n
                        (agenda_ziel_id, locale, titel, beschreibung)
                    VALUES (:id, CAST(:loc AS content_locale), :titel, :besch)
                    """
                ),
                {"id": zid, "loc": loc, "titel": titel, "besch": besch},
            )


def downgrade() -> None:
    conn = op.get_bind()
    for neu in _NEU:
        zid = neu[0]
        conn.execute(sa.text("DELETE FROM agenda_ziele WHERE id = :id"), {"id": zid})
    for zid, tabelle, *_ in _UMSTELLUNG:
        mc, bt, bp, t_de, t_en, b_de, b_en = _ALT[zid]
        _setze(conn, tabelle, zid, mc, bt, bp, (t_de, t_en, b_de, b_en))
