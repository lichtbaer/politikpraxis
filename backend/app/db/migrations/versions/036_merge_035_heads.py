"""Merge 035_merge_034_heads und 035_steuern_sma335.

Revision ID: 036_merge_035_heads
Revises: 035_merge_034_heads, 035_steuern_sma335
Create Date: 2026-03-20

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "036_merge_035_heads"
down_revision: Union[str, Sequence[str], None] = (
    "035_merge_034_heads",
    "035_steuern_sma335",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration ohne Schema-Änderungen."""
    pass


def downgrade() -> None:
    """Merge migration ohne Schema-Änderungen."""
    pass
