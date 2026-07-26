"""#273: Event-Pool staffeln — repeatable/cooldown_months auf events + kuratierte min_complexity.

Fügt `repeatable`/`cooldown_months` als neue Spalten auf `events` hinzu (bisher nur im
Frontend-Typ vorhanden, siehe Issue #273) und kuratiert `min_complexity` sowie die
repeatable-Basiskrisen für die 29 Random-Events aus `backend/app/content/events/random.yaml`.

Hinweis: Sieben der 29 YAML-Events (g7_krise, migration_krise sowie fünf Follow-up-Events:
verfassungsklage_schulden, wiederaufbau_debatte, diplomatische_krise, opposition_vorwurf,
gewerkschaft_eskalation) existieren noch nicht in der `events`-Tabelle — vorbestehender
Content-Drift zwischen YAML und DB (verwandt zu #244), hier nicht behoben. Die UPDATEs
unten sind für diese IDs No-Ops. Alle acht als `repeatable` kuratierten Basiskrisen
existieren jedoch in der DB, das Spätspiel-Kriterium ("auch in Monat 36-48 werden noch
Events gezogen") ist damit über den echten `/content/events`-Pfad erfüllt.

Revision ID: 064_events_pool_staffelung_sma273
Revises: 063_eu_events_locale_enum
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "064_events_pool_staffelung_sma273"
down_revision: Union[str, Sequence[str], None] = "063_eu_events_locale_enum"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (id, min_complexity, repeatable, cooldown_months) — gespiegelt aus
# backend/app/content/events/random.yaml
_EVENTS = [
    ("haushalt", 1, True, 12),
    ("skandal", 1, True, 10),
    ("euklage", 2, False, None),
    ("konjunktur", 1, True, 12),
    ("koalition_krise", 1, False, None),
    ("demo", 1, True, 11),
    ("eufoerder", 2, False, None),
    ("verfassungsgericht", 3, False, None),
    ("naturkatastrophe", 2, False, None),
    ("cyberangriff", 3, False, None),
    ("g7_krise", 3, False, None),
    ("whistleblower", 3, False, None),
    ("streikwelle", 1, True, 14),
    ("wohnungsnot", 1, False, None),
    ("rechtsextremismus", 2, False, None),
    ("fachkraeftemangel", 1, True, 14),
    ("energiekrise", 1, True, 13),
    ("rentendebatte", 2, False, None),
    ("pandemie_vorbereitung", 2, False, None),
    ("infrastruktur_kollaps", 1, True, 12),
    ("migration_krise", 2, False, None),
    ("verfassungsklage_schulden", 1, False, None),
    ("wiederaufbau_debatte", 2, False, None),
    ("diplomatische_krise", 3, False, None),
    ("opposition_vorwurf", 2, False, None),
    ("gewerkschaft_eskalation", 1, False, None),
    ("bauernproteste", 1, False, None),
    ("pflegenotstand", 1, False, None),
    ("ki_vorfall", 3, False, None),
]


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("repeatable", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "events",
        sa.Column("cooldown_months", sa.Integer(), nullable=True),
    )

    conn = op.get_bind()
    for eid, min_complexity, repeatable, cooldown_months in _EVENTS:
        conn.execute(
            sa.text(
                """
                UPDATE events SET
                    min_complexity = :mc,
                    repeatable = :rep,
                    cooldown_months = :cd
                WHERE id = :eid
                """
            ),
            {
                "eid": eid,
                "mc": min_complexity,
                "rep": repeatable,
                "cd": cooldown_months,
            },
        )


def downgrade() -> None:
    op.drop_column("events", "cooldown_months")
    op.drop_column("events", "repeatable")
