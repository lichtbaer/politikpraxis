"""Merge 031_verband_startbeziehungen und 031_verbands_cost_pk.

Revision ID: 032_merge_031_heads
Revises: 031_verband_startbeziehungen, 031_verbands_cost_pk
Create Date: 2026-03-18
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "032_merge_031_heads"
down_revision: Union[str, Sequence[str], None] = (
    "031_verband_startbeziehungen",
    "031_verbands_cost_pk",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration without schema changes."""
    pass


def downgrade() -> None:
    """Merge migration without schema changes."""
    pass
