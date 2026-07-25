"""Partial-Index für Highscore-Sortierung auf game_stats (#251).

get_highscores() (stats_service.py) filtert ausschließlich mit
opt_in_community=true und sortiert nach wahlprognose DESC, created_at DESC.
Der bestehende Index ix_game_stats_community (partei, gewonnen, complexity)
WHERE opt_in_community trägt bereits die Gruppierung nach partei in
get_community_stats(); für die Highscore-Sortierung fehlte bislang ein
passender Index — ohne ihn sortiert Postgres mit wachsender Tabelle per
Full-Table-Scan + Sort.

Revision ID: 061_game_stats_idx
Revises: 060_admin_rate_limit
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "061_game_stats_idx"
down_revision: Union[str, Sequence[str], None] = "060_admin_rate_limit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_game_stats_optin_wahlprognose",
        "game_stats",
        ["opt_in_community", "wahlprognose", "created_at"],
        postgresql_where=text("opt_in_community"),
    )


def downgrade() -> None:
    op.drop_index("ix_game_stats_optin_wahlprognose", table_name="game_stats")
