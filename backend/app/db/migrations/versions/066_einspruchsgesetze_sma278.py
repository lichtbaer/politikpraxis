"""#278: Land-Gesetze explizit als Einspruchs- oder Zustimmungsgesetz markieren (Art. 77 GG).

Bisher hatte kein Gesetz einen expliziten `zustimmungspflichtig`-Wert; das
Frontend (`contentStore.ts`) wich für alle `land`-Gesetze auf den impliziten
Default `zustimmungspflichtig: true` aus (`api.zustimmungspflichtig ??
tags.includes('land')`). Der in `bundesrat.ts`/`ueberstimmeBReinspruch`
sauber implementierte Art.-77-Überstimmungspfad (Einspruchsgesetz) trat
dadurch im normalen Spielverlauf nie auf — real sind Einspruchsgesetze die
Regel, Zustimmungsgesetze die begründungspflichtige Ausnahme.

Diese Migration setzt `zustimmungspflichtig` für alle vier bestehenden
`land`-Gesetze explizit, mit fachlicher Begründung:

- `mietrecht` (Mietrechtsreform): Miet-/Vertragsrecht ist Teil des BGB
  (konkurrierende Bundesgesetzgebung, Art. 74 Abs. 1 Nr. 1 GG) und wird von
  den Ländern im Regelfall ohne bundesrechtlich vorgegebenes eigenes
  Verwaltungsverfahren vollzogen (Zivilgerichte) → Einspruchsgesetz.
- `katastrophenschutz` (Katastrophenschutz-Modernisierung): Ziviler
  Katastrophenschutz ist originär Länderaufgabe; das Bundesgesetz
  koordiniert/finanziert, schreibt den Ländern aber kein eigenes
  Verwaltungsverfahren vor (Art. 84 Abs. 1 GG bleibt unberührt) →
  Einspruchsgesetz.
- `wb` (Bundeswohnungsbauoffensive): Bund-Länder-Förderprogramm, das die
  Länder mit einem bundesrechtlich vorgegebenen Verwaltungsverfahren
  ausführen (vgl. Städtebauförderung) → Zustimmungsgesetz (Art. 84 Abs. 1 GG).
- `bp` (Nationales Bildungspaket): Greift in die Bildungshoheit der Länder
  ein und bindet Länderfinanzierung an bundesrechtliche Verfahrensvorgaben
  (vgl. BAföG-Praxis) → Zustimmungsgesetz.

Damit bleiben beide Gesetzestypen unter den `land`-Gesetzen vertreten — der
Spieler erlebt weiterhin echte, endgültige Blockaden (`wb`, `bp`) und den
Überstimmungspfad (`mietrecht`, `katastrophenschutz`).

Revision ID: 066_einspruchsgesetze_sma278
Revises: 065_event_arcs_sma272
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "066_einspruchsgesetze_sma278"
down_revision: Union[str, Sequence[str], None] = "065_event_arcs_sma272"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_EINSPRUCHSGESETZE = ["mietrecht", "katastrophenschutz"]
_ZUSTIMMUNGSGESETZE = ["wb", "bp"]


def upgrade() -> None:
    conn = op.get_bind()
    gesetze = sa.table(
        "gesetze",
        sa.column("id", sa.Text()),
        sa.column("zustimmungspflichtig", sa.Boolean()),
    )
    conn.execute(
        gesetze.update()
        .where(gesetze.c.id.in_(_EINSPRUCHSGESETZE))
        .values(zustimmungspflichtig=False)
    )
    conn.execute(
        gesetze.update()
        .where(gesetze.c.id.in_(_ZUSTIMMUNGSGESETZE))
        .values(zustimmungspflichtig=True)
    )


def downgrade() -> None:
    conn = op.get_bind()
    gesetze = sa.table(
        "gesetze",
        sa.column("id", sa.Text()),
        sa.column("zustimmungspflichtig", sa.Boolean()),
    )
    conn.execute(
        gesetze.update()
        .where(gesetze.c.id.in_(_EINSPRUCHSGESETZE + _ZUSTIMMUNGSGESETZE))
        .values(zustimmungspflichtig=None)
    )
