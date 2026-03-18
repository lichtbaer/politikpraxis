"""Merge 033_merge_032_heads und 033_chars_kabinett.

Revision ID: 034_merge_033_heads
Revises: 033_merge_032_heads, 033_chars_kabinett
Create Date: 2026-03-18

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "034_merge_033_heads"
down_revision: Union[str, Sequence[str], None] = (
    "033_merge_032_heads",
    "033_chars_kabinett",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration without schema changes."""
    pass


def downgrade() -> None:
    """Merge migration without schema changes."""
    pass
