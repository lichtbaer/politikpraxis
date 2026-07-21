"""Composite Indizes für GameStat-Community-Stats/Highscores (#251).

Die Community-Stats-/Highscore-Queries (stats_service.py) filtern über
`opt_in_community` und gruppieren/sortieren zusätzlich nach `partei` bzw.
`wahlprognose`. Ohne passende Indizes werden das mit wachsender Tabelle
Full-Table-Scans.

Revision ID: 061_game_stat_indexes
Revises: 060_admin_rate_limit
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "061_game_stat_indexes"
down_revision: Union[str, Sequence[str], None] = "060_admin_rate_limit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_game_stats_optin_partei "
        "ON game_stats (opt_in_community, partei)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_game_stats_optin_wahlprognose "
        "ON game_stats (opt_in_community, wahlprognose DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_game_stats_optin_wahlprognose")
    op.execute("DROP INDEX IF EXISTS ix_game_stats_optin_partei")
