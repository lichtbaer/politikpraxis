"""#279: Char-zu-Char-Beziehungsmatrix zwischen Kabinettsmitgliedern.

Bisher existierten Beziehungen nur Spieler↔Charakter (`mood`/`loyalty`) — die
in Event-Texten angedeuteten Konflikte zwischen Ministern (z.B. Finanz- vs.
Wirtschaftsministerin beim Haushalt-Event) waren mechanisch nicht abgebildet.

Diese Migration fügt die Spalte `relationships` (JSONB-Liste je Char, Eintrag
`{"target": <char_id>, "type": "verbuendet"|"verfeindet", "staerke": 1-2}`)
hinzu und seedet eine erste Beziehungsmatrix für das bestehende Kabinett,
fachlich hergeleitet aus den Ressort-Interessen in `characters/default.yaml`:

- fm↔wm (verfeindet, 2): Haushaltsdisziplin vs. Wachstums-/Standortpolitik —
  das im Issue selbst genannte Beispiel für strukturelle Rivalität.
- fm↔um (verfeindet, 2): Schuldenbremse vs. teure Klimainvestitionen.
- fm↔am, fm↔gm, fm↔bm (verfeindet, 1): Sozial-/Pflege-/Bildungsausgaben
  stehen strukturell gegen den Sparkurs des Finanzministers.
- wm↔um (verbündet, 2): Industrietransformation verbindet Wirtschafts- und
  Umweltressort — das Issue nennt explizit "zwei Verbündete" als Ziel.
- wm↔am (verfeindet, 1): Mindestlohn/Tarifbindung vs. Standortpolitik.
- im↔jm (verfeindet, 2): innere Sicherheit vs. Grundrechte/Rechtsstaat.
- kanzler↔im (verfeindet, 2): Braun "misstraut der Koalition grundsätzlich".
- kanzler↔jm (verbündet, 2): Kern "schützt die Koalition vor teuren Fehlern".
- am↔jm (verbündet, 1): Sozialstaat- und Rechtsstaat-Positionen decken sich.
- bm↔um (verbündet, 1): beide progressive Reformressorts.

Jedes Paar wird symmetrisch (auf beiden Seiten) gespeichert, damit sich das
Frontend nicht selbst um die Spiegelung kümmern muss.

Revision ID: 067_char_beziehungen_sma279
Revises: 066_einspruchsgesetze_sma278
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "067_char_beziehungen_sma279"
down_revision: Union[str, Sequence[str], None] = "066_einspruchsgesetze_sma278"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (char_a, char_b, type, staerke) — wird beim Seed in beide Richtungen gespiegelt.
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


def _build_relationship_map() -> dict[str, list[dict]]:
    by_char: dict[str, list[dict]] = {}
    for a, b, typ, staerke in _BEZIEHUNGEN:
        by_char.setdefault(a, []).append({"target": b, "type": typ, "staerke": staerke})
        by_char.setdefault(b, []).append({"target": a, "type": typ, "staerke": staerke})
    return by_char


def upgrade() -> None:
    op.add_column(
        "chars", sa.Column("relationships", postgresql.JSONB(), nullable=True)
    )

    conn = op.get_bind()
    for char_id, entries in _build_relationship_map().items():
        conn.execute(
            sa.text(
                "UPDATE chars SET relationships = CAST(:relationships AS jsonb) "
                "WHERE id = :char_id"
            ),
            {"relationships": json.dumps(entries), "char_id": char_id},
        )


def downgrade() -> None:
    op.drop_column("chars", "relationships")
