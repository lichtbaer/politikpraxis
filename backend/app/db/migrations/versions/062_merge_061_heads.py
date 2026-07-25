"""Merge 061_game_stats_idx und 061_mods_table.

Beide Revisionen wurden unabhängig voneinander auf `main` gemergt (PRs zu
#251 bzw. zur Mods-Tabelle) und hängen jeweils an `060_admin_rate_limit` —
dadurch sind zwei parallele Heads entstanden, die den `alembic-migrations`-
CI-Job brechen. Da beide Revisionen bereits deployt sind, werden sie nicht
nachträglich umgehängt (siehe docs/entwicklung/db-migrationen.md, Punkt 5),
sondern hier per Merge-Migration zusammengeführt.

Revision ID: 062_merge_061_heads
Revises: 061_game_stats_idx, 061_mods_table
Create Date: 2026-07-25

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "062_merge_061_heads"
down_revision: Union[str, Sequence[str], None] = (
    "061_game_stats_idx",
    "061_mods_table",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration without schema changes."""
    pass


def downgrade() -> None:
    """Merge migration without schema changes."""
    pass
