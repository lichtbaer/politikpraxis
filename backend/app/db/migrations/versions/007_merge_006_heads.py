"""Merge 006_seed_gesetze und 006_chars_cabinet (SMA-267)

Revision ID: 007_merge
Revises: 006_seed_gesetze, 006_chars_cabinet
Create Date: 2025-03-17

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_merge"
down_revision: Union[str, Sequence[str], None] = ("006_seed_gesetze", "006_chars_cabinet")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration — keine Schema-Änderung."""
    pass


def downgrade() -> None:
    """Merge migration — keine Schema-Änderung."""
    pass
