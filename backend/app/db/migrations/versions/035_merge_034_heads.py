"""Merge 034_merge_033_heads und 034_sma329.

Revision ID: 035_merge_034_heads
Revises: 034_merge_033_heads, 034_sma329
Create Date: 2026-03-18

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "035_merge_034_heads"
down_revision: Union[str, Sequence[str], None] = (
    "034_merge_033_heads",
    "034_sma329",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration without schema changes."""
    pass


def downgrade() -> None:
    """Merge migration without schema changes."""
    pass
