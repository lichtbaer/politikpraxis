"""#481: Kabinett auf Stufe 1 — Kanzler und erster Minister je Partei ab Stufe 1.

Laut ``docs/game-design/komplexitaet.md`` besteht das Kabinett auf Stufe 1 aus zwei
Personen: der Spielerin/dem Spieler als Kanzler/in und einem Minister aus dem
Parteipool. Migration 033 hat alle Pool-Chars aber fest mit ``min_complexity = 2``
angelegt (040 ebenso ``sdp_kanzler``); ``createInitialState`` filtert sie auf
Stufe 1 heraus, und es blieb nur der synthetische Kanzler. Die Legacy-Chars
``kanzler``/``fm`` aus Migration 006 hatten ``min_complexity = 1``, wurden aber in
040 gelöscht — dasselbe Muster wie bei der Beziehungsmatrix (#279, Migration 072).

Diese Migration öffnet ab Stufe 1:

- die Kanzler-Chars aller Parteien (``ist_kanzler``) — sie liefern die Basiswerte
  des synthetischen Kanzlers; fehlen sie, erbt der Kanzler Ressort und Boni eines
  Ministers,
- je Partei den Minister ihres ersten Präferenz-Ressorts (``RESSORT_PRAEFERENZEN``
  in ``frontend/src/core/kabinett.ts``).

Revision ID: 073_kabinett_stufe1
Revises: 072_char_beziehungen_pool
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "073_kabinett_stufe1"
down_revision: Union[str, Sequence[str], None] = "072_char_beziehungen_pool"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Partei → erstes Präferenz-Ressort (frontend/src/core/kabinett.ts, RESSORT_PRAEFERENZEN)
_STUFE1_RESSORT: dict[str, str] = {
    "sdp": "arbeit",
    "cdp": "finanzen",
    "gp": "umwelt",
    "ldp": "wirtschaft",
    "lp": "arbeit",
}

_UPDATE_STUFE1 = """
UPDATE chars SET min_complexity = :wert
WHERE pool_partei IS NOT NULL
    AND (
        ist_kanzler
        OR (pool_partei, ressort) IN (
            ('sdp', :sdp), ('cdp', :cdp), ('gp', :gp), ('ldp', :ldp), ('lp', :lp)
        )
    )
"""


def _set_min_complexity(wert: int) -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(_UPDATE_STUFE1),
        {"wert": wert, **_STUFE1_RESSORT},
    )


def upgrade() -> None:
    _set_min_complexity(1)


def downgrade() -> None:
    _set_min_complexity(2)
