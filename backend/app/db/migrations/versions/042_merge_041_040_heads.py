"""Merge der aktuellen Heads: usertest_feedback + pool_minister_content.

Revision ID: 042_merge_041_040_heads
Revises: 041_pool_minister_content, 040_usertest_feedback
Create Date: 2026-03-26
"""

from typing import Sequence, Union


revision: str = "042_merge_041_040_heads"
down_revision: Union[str, Sequence[str], None] = (
    "041_pool_minister_content",
    "040_usertest_feedback",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Schema-Only Merge ohne zusätzliche DDL."""


def downgrade() -> None:
    """Schema-Only Merge ohne zusätzliche DDL."""
