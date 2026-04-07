"""Spalte beschreibung_en zu gesetz_relationen hinzufügen (EN-Übersetzung der internen Beschreibung).

Revision ID: 055_gesetzrel_besch_en
Revises: 054_bundeslaender_i18n
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "055_gesetzrel_besch_en"
down_revision: Union[str, Sequence[str], None] = "054_bundeslaender_i18n"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "gesetz_relationen",
        sa.Column("beschreibung_en", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("gesetz_relationen", "beschreibung_en")
