"""Admin-Rate-Limit worker-/instanzübergreifend machen (#231).

Ersetzt das In-Memory-Sliding-Window (routes/admin.py) durch einen geteilten
Fixed-Window-Zähler in Postgres.

Revision ID: 060_admin_rate_limit
Revises: 059_content_i18n_en
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "060_admin_rate_limit"
down_revision: Union[str, Sequence[str], None] = "059_content_i18n_en"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_rate_limit_bucket",
        sa.Column("ip", sa.Text(), primary_key=True),
        sa.Column("window_start", sa.BigInteger(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("admin_rate_limit_bucket")
