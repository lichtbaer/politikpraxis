"""SMA-303: Framing-Optionen — label und slogan ergänzen

Revision ID: 024_framing_labels
Revises: 023_kommunal_laender
Create Date: 2025-03-17

Migration: label + slogan zu framing_optionen für 8 Gesetze.
"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "024_framing_labels"
down_revision: Union[str, Sequence[str], None] = "023_kommunal_laender"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Gesetz-ID -> Framing-Optionen mit label + slogan
FRAMING_WITH_LABELS = {
    "ee": [
        {
            "key": "klimaschutz",
            "label": "Klimagerechtigkeit",
            "slogan": "Erneuerbare Energien schützen unsere Lebensgrundlage",
            "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2},
            "verband_effekte": {"uvb": 3},
            "medienklima_delta": 2,
        },
        {
            "key": "wirtschaft",
            "label": "Wirtschaftsmotor",
            "slogan": "Die Energiewende schafft Arbeitsplätze und Wachstum",
            "milieu_effekte": {"leistungstraeger": 3, "buergerliche_mitte": 1},
            "verband_effekte": {"bdi": 2},
            "medienklima_delta": 0,
        },
        {
            "key": "kompromiss",
            "label": "Pragmatischer Kompromiss",
            "slogan": "Ausgewogene Energiewende für alle",
            "milieu_effekte": {"postmaterielle": 2, "leistungstraeger": 1},
            "verband_effekte": {},
            "medienklima_delta": 1,
        },
    ],
    "mindestlohn": [
        {
            "key": "sozial",
            "label": "Sozialer Ausgleich",
            "slogan": "Faire Löhne stärken den gesellschaftlichen Zusammenhalt",
            "milieu_effekte": {"soziale_mitte": 5, "prekaere": 4},
            "verband_effekte": {"gbd": 3},
            "medienklima_delta": 2,
        },
        {
            "key": "wirtschaft",
            "label": "Kaufkraftmotor",
            "slogan": "Mehr Kaufkraft stärkt die Konjunktur",
            "milieu_effekte": {"leistungstraeger": 2, "etablierte": 1},
            "verband_effekte": {"bdi": -2},
            "medienklima_delta": -1,
        },
        {
            "key": "moderat",
            "label": "Moderate Anpassung",
            "slogan": "Behutsame Erhöhung im gesellschaftlichen Konsens",
            "milieu_effekte": {"soziale_mitte": 2, "buergerliche_mitte": 1},
            "verband_effekte": {"gbd": 1},
            "medienklima_delta": 0,
        },
    ],
    "klimaschutz": [
        {
            "key": "ambitioniert",
            "label": "Ambitionierter Klimaschutz",
            "slogan": "Deutschland übernimmt Verantwortung für die nächste Generation",
            "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2},
            "verband_effekte": {"uvb": 4},
            "medienklima_delta": 3,
        },
        {
            "key": "pragmatisch",
            "label": "Pragmatischer Ansatz",
            "slogan": "Klimaschutz mit Augenmaß und Wirtschaftsverträglichkeit",
            "milieu_effekte": {"buergerliche_mitte": 2, "leistungstraeger": 1},
            "verband_effekte": {},
            "medienklima_delta": 1,
        },
        {
            "key": "zurueckhaltend",
            "label": "Zurückhaltende Umsetzung",
            "slogan": "Schrittweise Anpassung ohne Überforderung",
            "milieu_effekte": {"leistungstraeger": 2, "traditionelle": 1},
            "verband_effekte": {"bdi": 2},
            "medienklima_delta": -2,
        },
    ],
    "sicherheit_paket": [
        {
            "key": "staat",
            "label": "Staatliche Sicherheit",
            "slogan": "Starker Staat schützt die Bürger",
            "milieu_effekte": {"traditionelle": 4, "etablierte": 2},
            "verband_effekte": {"sgd": 3},
            "medienklima_delta": 1,
        },
        {
            "key": "buergerrechte",
            "label": "Bürgerrechte wahren",
            "slogan": "Sicherheit und Freiheit in Balance",
            "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1},
            "verband_effekte": {},
            "medienklima_delta": 0,
        },
        {
            "key": "balance",
            "label": "Ausgewogene Sicherheit",
            "slogan": "Sicherheit durch Prävention und Resozialisierung",
            "milieu_effekte": {"buergerliche_mitte": 2, "traditionelle": 1},
            "verband_effekte": {"sgd": 1},
            "medienklima_delta": 0,
        },
    ],
    "buerokratieabbau": [
        {
            "key": "unternehmen",
            "label": "Unternehmen entlasten",
            "slogan": "Weniger Bürokratie, mehr Wachstum",
            "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2},
            "verband_effekte": {"bdi": 4},
            "medienklima_delta": 2,
        },
        {
            "key": "buerger",
            "label": "Bürger entlasten",
            "slogan": "Anträge vereinfachen, Wartezeiten verkürzen",
            "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1},
            "verband_effekte": {},
            "medienklima_delta": 1,
        },
        {
            "key": "radikal",
            "label": "Radikaler Abbau",
            "slogan": "Schlanker Staat durch konsequenten Bürokratieabbau",
            "milieu_effekte": {"leistungstraeger": 2, "buergerliche_mitte": 2},
            "verband_effekte": {"bdi": 2},
            "medienklima_delta": -1,
        },
    ],
    "pflegereform": [
        {
            "key": "qualitaet",
            "label": "Qualität in der Pflege",
            "slogan": "Mehr Personal für bessere Versorgung",
            "milieu_effekte": {"soziale_mitte": 4, "prekaere": 2},
            "verband_effekte": {"pvd": 4},
            "medienklima_delta": 2,
        },
        {
            "key": "finanzierung",
            "label": "Finanzierbare Reform",
            "slogan": "Nachhaltige Finanzierung für langfristige Verbesserungen",
            "milieu_effekte": {"buergerliche_mitte": 2, "etablierte": 1},
            "verband_effekte": {"pvd": 1},
            "medienklima_delta": 0,
        },
        {
            "key": "personal",
            "label": "Personal stärken",
            "slogan": "Faire Bezahlung und bessere Arbeitsbedingungen",
            "milieu_effekte": {"prekaere": 3, "soziale_mitte": 2},
            "verband_effekte": {"pvd": 2},
            "medienklima_delta": 1,
        },
    ],
    "vermoegensteuer": [
        {
            "key": "progressiv",
            "label": "Progressive Steuer",
            "slogan": "Mehr Gerechtigkeit durch stärkere Besteuerung von Vermögen",
            "milieu_effekte": {"soziale_mitte": 5, "postmaterielle": 3},
            "verband_effekte": {"gbd": 2},
            "medienklima_delta": 2,
        },
        {
            "key": "moderat",
            "label": "Moderate Anpassung",
            "slogan": "Behutsame Reform ohne Überforderung",
            "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1},
            "verband_effekte": {},
            "medienklima_delta": 0,
        },
        {
            "key": "ablehnung",
            "label": "Ablehnung betonen",
            "slogan": "Vermögensteuer schadet Wirtschaft und Investitionen",
            "milieu_effekte": {"etablierte": 5, "leistungstraeger": 3},
            "verband_effekte": {"bdi": 5},
            "medienklima_delta": -3,
        },
    ],
    "ki_foerder": [
        {
            "key": "innovation",
            "label": "Innovation fördern",
            "slogan": "KI als Wachstumsmotor für die deutsche Wirtschaft",
            "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2},
            "verband_effekte": {"dwv": 4},
            "medienklima_delta": 2,
        },
        {
            "key": "regulierung",
            "label": "Regulierung betonen",
            "slogan": "KI verantwortungsvoll und ethisch gestalten",
            "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1},
            "verband_effekte": {},
            "medienklima_delta": 1,
        },
        {
            "key": "balance",
            "label": "Ausgewogene Förderung",
            "slogan": "Innovation und Regulierung Hand in Hand",
            "milieu_effekte": {"leistungstraeger": 2, "postmaterielle": 2},
            "verband_effekte": {"dwv": 2},
            "medienklima_delta": 0,
        },
    ],
}


def upgrade() -> None:
    """Füge label und slogan zu framing_optionen hinzu."""
    conn = op.get_bind()
    for gesetz_id, optionen in FRAMING_WITH_LABELS.items():
        json_val = json.dumps(optionen)
        conn.execute(
            sa.text("UPDATE gesetze SET framing_optionen = CAST(:opt AS jsonb) WHERE id = :gid"),
            {"opt": json_val, "gid": gesetz_id},
        )


def downgrade() -> None:
    """Entferne label und slogan (setze auf alte Struktur ohne label/slogan)."""
    conn = op.get_bind()
    framing_data_old = {
        "ee": [
            {"key": "klimaschutz", "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2}, "verband_effekte": {"uvb": 3}, "medienklima_delta": 2},
            {"key": "wirtschaft", "milieu_effekte": {"leistungstraeger": 3, "buergerliche_mitte": 1}, "verband_effekte": {"bdi": 2}, "medienklima_delta": 0},
            {"key": "kompromiss", "milieu_effekte": {"postmaterielle": 2, "leistungstraeger": 1}, "verband_effekte": {}, "medienklima_delta": 1},
        ],
        "mindestlohn": [
            {"key": "sozial", "milieu_effekte": {"soziale_mitte": 5, "prekaere": 4}, "verband_effekte": {"gbd": 3}, "medienklima_delta": 2},
            {"key": "wirtschaft", "milieu_effekte": {"leistungstraeger": 2, "etablierte": 1}, "verband_effekte": {"bdi": -2}, "medienklima_delta": -1},
            {"key": "moderat", "milieu_effekte": {"soziale_mitte": 2, "buergerliche_mitte": 1}, "verband_effekte": {"gbd": 1}, "medienklima_delta": 0},
        ],
        "klimaschutz": [
            {"key": "ambitioniert", "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2}, "verband_effekte": {"uvb": 4}, "medienklima_delta": 3},
            {"key": "pragmatisch", "milieu_effekte": {"buergerliche_mitte": 2, "leistungstraeger": 1}, "verband_effekte": {}, "medienklima_delta": 1},
            {"key": "zurueckhaltend", "milieu_effekte": {"leistungstraeger": 2, "traditionelle": 1}, "verband_effekte": {"bdi": 2}, "medienklima_delta": -2},
        ],
        "sicherheit_paket": [
            {"key": "staat", "milieu_effekte": {"traditionelle": 4, "etablierte": 2}, "verband_effekte": {"sgd": 3}, "medienklima_delta": 1},
            {"key": "buergerrechte", "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1}, "verband_effekte": {}, "medienklima_delta": 0},
            {"key": "balance", "milieu_effekte": {"buergerliche_mitte": 2, "traditionelle": 1}, "verband_effekte": {"sgd": 1}, "medienklima_delta": 0},
        ],
        "buerokratieabbau": [
            {"key": "unternehmen", "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2}, "verband_effekte": {"bdi": 4}, "medienklima_delta": 2},
            {"key": "buerger", "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1}, "verband_effekte": {}, "medienklima_delta": 1},
            {"key": "radikal", "milieu_effekte": {"leistungstraeger": 2, "buergerliche_mitte": 2}, "verband_effekte": {"bdi": 2}, "medienklima_delta": -1},
        ],
        "pflegereform": [
            {"key": "qualitaet", "milieu_effekte": {"soziale_mitte": 4, "prekaere": 2}, "verband_effekte": {"pvd": 4}, "medienklima_delta": 2},
            {"key": "finanzierung", "milieu_effekte": {"buergerliche_mitte": 2, "etablierte": 1}, "verband_effekte": {"pvd": 1}, "medienklima_delta": 0},
            {"key": "personal", "milieu_effekte": {"prekaere": 3, "soziale_mitte": 2}, "verband_effekte": {"pvd": 2}, "medienklima_delta": 1},
        ],
        "vermoegensteuer": [
            {"key": "progressiv", "milieu_effekte": {"soziale_mitte": 5, "postmaterielle": 3}, "verband_effekte": {"gbd": 2}, "medienklima_delta": 2},
            {"key": "moderat", "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1}, "verband_effekte": {}, "medienklima_delta": 0},
            {"key": "ablehnung", "milieu_effekte": {"etablierte": 5, "leistungstraeger": 3}, "verband_effekte": {"bdi": 5}, "medienklima_delta": -3},
        ],
        "ki_foerder": [
            {"key": "innovation", "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2}, "verband_effekte": {"dwv": 4}, "medienklima_delta": 2},
            {"key": "regulierung", "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1}, "verband_effekte": {}, "medienklima_delta": 1},
            {"key": "balance", "milieu_effekte": {"leistungstraeger": 2, "postmaterielle": 2}, "verband_effekte": {"dwv": 2}, "medienklima_delta": 0},
        ],
    }
    for gesetz_id, optionen in framing_data_old.items():
        json_val = json.dumps(optionen)
        conn.execute(
            sa.text("UPDATE gesetze SET framing_optionen = CAST(:opt AS jsonb) WHERE id = :gid"),
            {"opt": json_val, "gid": gesetz_id},
        )
