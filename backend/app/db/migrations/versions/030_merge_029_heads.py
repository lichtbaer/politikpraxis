"""Merge 029_gesetz_relationen und 029_gesetze_erweiterung (SMA-312/SMA-311)

Revision ID: 030_merge_029_heads
Revises: 029_gesetz_relationen, 029_gesetze_erweiterung
Create Date: 2026-03-18
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "030_merge_029_heads"
down_revision: Union[str, Sequence[str], None] = (
    "029_gesetz_relationen",
    "029_gesetze_erweiterung",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration — keine Schema-Änderung."""
    pass


def downgrade() -> None:
    """Merge migration — keine Schema-Änderung."""
    pass
