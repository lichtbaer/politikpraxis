"""#279: Beziehungsmatrix für die Partei-Pool-Minister nachziehen.

Migration 067 hat die Char-zu-Char-Beziehungen per ``UPDATE chars ... WHERE id =
'fm'|'wm'|'kanzler'|...`` geseedet. Diese Legacy-Chars hatte Migration 040
(``040_consolidate_cabinet``, ``LEGACY_IDS``) aber bereits gelöscht — die UPDATEs
trafen keine Zeile, und alle Pool-Chars (``cdp_fm``, ``sdp_am``, ``gp_kanzlerin``,
…) blieben ohne ``relationships``. Die Matrix war in der Live-DB damit leer.

Diese Migration weist jedem Pool-Char die in 067 beabsichtigte Matrix anhand
seiner Rolle zu:

- Rolle = Ressort-Kürzel (``finanzen`` → ``fm``, ``wirtschaft`` → ``wm``, …),
  Kanzler/Kanzlerin (``ist_kanzler``) → ``kanzler``.
- Ziele bleiben ROLLEN-Schlüssel (``{"target": "wm", ...}``), keine Char-IDs:
  welcher Minister ein Ressort besetzt, hängt von Spieler-Partei und
  Koalitionspartner ab. Das Frontend löst die Rolle zur Laufzeit auf den
  aktuellen Kabinetts-Minister auf (``resolveCharById``).

Die Matrix ist hier eingefroren (kein Lesen von YAML zur Laufzeit) und
entspricht 1:1 ``_BEZIEHUNGEN`` aus Migration 067 — symmetrisch gespeichert.

Revision ID: 072_char_beziehungen_pool
Revises: 071_event_arc_stahlkrise_sma272
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "072_char_beziehungen_pool"
down_revision: Union[str, Sequence[str], None] = "071_event_arc_stahlkrise_sma272"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Rollen-Matrix aus Migration 067: (rolle_a, rolle_b, type, staerke),
# beim Seed in beide Richtungen gespiegelt.
_BEZIEHUNGEN: list[tuple[str, str, str, int]] = [
    ("fm", "wm", "verfeindet", 2),
    ("fm", "um", "verfeindet", 2),
    ("fm", "am", "verfeindet", 1),
    ("fm", "gm", "verfeindet", 1),
    ("fm", "bm", "verfeindet", 1),
    ("wm", "um", "verbuendet", 2),
    ("wm", "am", "verfeindet", 1),
    ("im", "jm", "verfeindet", 2),
    ("kanzler", "im", "verfeindet", 2),
    ("kanzler", "jm", "verbuendet", 2),
    ("am", "jm", "verbuendet", 1),
    ("bm", "um", "verbuendet", 1),
]

# Ressort (chars.ressort) → Rollen-Schlüssel; deckungsgleich mit
# LEGACY_ID_TO_RESSORT im Frontend (core/systems/kabinett/characters.ts).
_RESSORT_ZU_ROLLE: dict[str, str] = {
    "finanzen": "fm",
    "wirtschaft": "wm",
    "innen": "im",
    "justiz": "jm",
    "umwelt": "um",
    "arbeit": "am",
    "gesundheit": "gm",
    "bildung": "bm",
}


def _build_role_map() -> dict[str, list[dict[str, object]]]:
    by_role: dict[str, list[dict[str, object]]] = {}
    for a, b, typ, staerke in _BEZIEHUNGEN:
        by_role.setdefault(a, []).append({"target": b, "type": typ, "staerke": staerke})
        by_role.setdefault(b, []).append({"target": a, "type": typ, "staerke": staerke})
    return by_role


def upgrade() -> None:
    conn = op.get_bind()
    role_map = _build_role_map()

    # Kanzler/Kanzlerin aller Parteien
    conn.execute(
        sa.text(
            "UPDATE chars SET relationships = CAST(:relationships AS jsonb) "
            "WHERE pool_partei IS NOT NULL AND ist_kanzler"
        ),
        {"relationships": json.dumps(role_map["kanzler"])},
    )

    # Minister je Ressort
    for ressort, rolle in _RESSORT_ZU_ROLLE.items():
        conn.execute(
            sa.text(
                "UPDATE chars SET relationships = CAST(:relationships AS jsonb) "
                "WHERE pool_partei IS NOT NULL AND NOT ist_kanzler "
                "AND ressort = :ressort"
            ),
            {"relationships": json.dumps(role_map[rolle]), "ressort": ressort},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE chars SET relationships = NULL "
            "WHERE pool_partei IS NOT NULL "
            "AND (ist_kanzler OR ressort = ANY(:ressorts))"
        ),
        {"ressorts": list(_RESSORT_ZU_ROLLE)},
    )
