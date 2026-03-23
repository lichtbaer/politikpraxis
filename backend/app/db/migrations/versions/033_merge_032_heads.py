"""Merge alle 032-Head-Revisionen.

Revision ID: 033_merge_032_heads
Revises: 032_bundesrat_sma325, 032_milieu_beschr, 032_merge_031_heads
Create Date: 2026-03-18
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "033_merge_032_heads"
down_revision: Union[str, Sequence[str], None] = (
    "032_bundesrat_sma325",
    "032_milieu_beschr",
    "032_merge_031_heads",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration without schema changes."""
    pass


def downgrade() -> None:
    """Merge migration without schema changes."""
    pass
