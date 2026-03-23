"""Seed Framing-Optionen für 8 Prioritäts-Gesetze (SMA-276)

Revision ID: 019_seed_framing
Revises: 018_seed_wahlkampf
Create Date: 2025-03-17

Migration 6: Framing-Optionen für ee, mindestlohn, klimaschutz, sicherheit_paket,
buerokratieabbau, pflegereform, vermoegensteuer, ki_foerder.
Format: [{ key, milieu_effekte: {milieu_id: delta}, verband_effekte: {verband_id: delta}, medienklima_delta }]
"""

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "019_seed_framing"
down_revision: Union[str, Sequence[str], None] = "018_seed_wahlkampf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed framing_optionen für 8 Gesetze."""
    conn = op.get_bind()

    # Gesetz-ID -> JSON-Array von Framing-Optionen
    framing_data = {
        "ee": [
            {
                "key": "klimaschutz",
                "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2},
                "verband_effekte": {"uvb": 3},
                "medienklima_delta": 2,
            },
            {
                "key": "wirtschaft",
                "milieu_effekte": {"leistungstraeger": 3, "buergerliche_mitte": 1},
                "verband_effekte": {"bdi": 2},
                "medienklima_delta": 0,
            },
            {
                "key": "kompromiss",
                "milieu_effekte": {"postmaterielle": 2, "leistungstraeger": 1},
                "verband_effekte": {},
                "medienklima_delta": 1,
            },
        ],
        "mindestlohn": [
            {
                "key": "sozial",
                "milieu_effekte": {"soziale_mitte": 5, "prekaere": 4},
                "verband_effekte": {"gbd": 3},
                "medienklima_delta": 2,
            },
            {
                "key": "wirtschaft",
                "milieu_effekte": {"leistungstraeger": 2, "etablierte": 1},
                "verband_effekte": {"bdi": -2},
                "medienklima_delta": -1,
            },
            {
                "key": "moderat",
                "milieu_effekte": {"soziale_mitte": 2, "buergerliche_mitte": 1},
                "verband_effekte": {"gbd": 1},
                "medienklima_delta": 0,
            },
        ],
        "klimaschutz": [
            {
                "key": "ambitioniert",
                "milieu_effekte": {"postmaterielle": 5, "soziale_mitte": 2},
                "verband_effekte": {"uvb": 4},
                "medienklima_delta": 3,
            },
            {
                "key": "pragmatisch",
                "milieu_effekte": {"buergerliche_mitte": 2, "leistungstraeger": 1},
                "verband_effekte": {},
                "medienklima_delta": 1,
            },
            {
                "key": "zurueckhaltend",
                "milieu_effekte": {"leistungstraeger": 2, "traditionelle": 1},
                "verband_effekte": {"bdi": 2},
                "medienklima_delta": -2,
            },
        ],
        "sicherheit_paket": [
            {
                "key": "staat",
                "milieu_effekte": {"traditionelle": 4, "etablierte": 2},
                "verband_effekte": {"sgd": 3},
                "medienklima_delta": 1,
            },
            {
                "key": "buergerrechte",
                "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1},
                "verband_effekte": {},
                "medienklima_delta": 0,
            },
            {
                "key": "balance",
                "milieu_effekte": {"buergerliche_mitte": 2, "traditionelle": 1},
                "verband_effekte": {"sgd": 1},
                "medienklima_delta": 0,
            },
        ],
        "buerokratieabbau": [
            {
                "key": "unternehmen",
                "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2},
                "verband_effekte": {"bdi": 4},
                "medienklima_delta": 2,
            },
            {
                "key": "buerger",
                "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1},
                "verband_effekte": {},
                "medienklima_delta": 1,
            },
            {
                "key": "radikal",
                "milieu_effekte": {"leistungstraeger": 2, "buergerliche_mitte": 2},
                "verband_effekte": {"bdi": 2},
                "medienklima_delta": -1,
            },
        ],
        "pflegereform": [
            {
                "key": "qualitaet",
                "milieu_effekte": {"soziale_mitte": 4, "prekaere": 2},
                "verband_effekte": {"pvd": 4},
                "medienklima_delta": 2,
            },
            {
                "key": "finanzierung",
                "milieu_effekte": {"buergerliche_mitte": 2, "etablierte": 1},
                "verband_effekte": {"pvd": 1},
                "medienklima_delta": 0,
            },
            {
                "key": "personal",
                "milieu_effekte": {"prekaere": 3, "soziale_mitte": 2},
                "verband_effekte": {"pvd": 2},
                "medienklima_delta": 1,
            },
        ],
        "vermoegensteuer": [
            {
                "key": "progressiv",
                "milieu_effekte": {"soziale_mitte": 5, "postmaterielle": 3},
                "verband_effekte": {"gbd": 2},
                "medienklima_delta": 2,
            },
            {
                "key": "moderat",
                "milieu_effekte": {"buergerliche_mitte": 2, "soziale_mitte": 1},
                "verband_effekte": {},
                "medienklima_delta": 0,
            },
            {
                "key": "ablehnung",
                "milieu_effekte": {"etablierte": 5, "leistungstraeger": 3},
                "verband_effekte": {"bdi": 5},
                "medienklima_delta": -3,
            },
        ],
        "ki_foerder": [
            {
                "key": "innovation",
                "milieu_effekte": {"leistungstraeger": 4, "etablierte": 2},
                "verband_effekte": {"dwv": 4},
                "medienklima_delta": 2,
            },
            {
                "key": "regulierung",
                "milieu_effekte": {"postmaterielle": 3, "soziale_mitte": 1},
                "verband_effekte": {},
                "medienklima_delta": 1,
            },
            {
                "key": "balance",
                "milieu_effekte": {"leistungstraeger": 2, "postmaterielle": 2},
                "verband_effekte": {"dwv": 2},
                "medienklima_delta": 0,
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
    """Reset framing_optionen auf leeres Array für die 8 Gesetze."""
    conn = op.get_bind()
    gesetz_ids = [
        "ee",
        "mindestlohn",
        "klimaschutz",
        "sicherheit_paket",
        "buerokratieabbau",
        "pflegereform",
        "vermoegensteuer",
        "ki_foerder",
    ]
    for gid in gesetz_ids:
        conn.execute(
            sa.text(
                "UPDATE gesetze SET framing_optionen = '[]'::jsonb WHERE id = :gid"
            ),
            {"gid": gid},
        )
