"""SMA-339: Tabelle game_saves (3 Slots pro User, serverseitige Spielstände).

Revision ID: 037_game_saves_sma339
Revises: 036_sma338_auth
Create Date: 2026-03-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "037_game_saves_sma339"
down_revision: Union[str, Sequence[str], None] = "036_sma338_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_saves",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slot", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column(
            "game_state", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("partei", sa.Text(), nullable=True),
        sa.Column("monat", sa.Integer(), nullable=True),
        sa.Column("wahlprognose", sa.Numeric(5, 2), nullable=True),
        sa.Column("complexity", sa.Integer(), nullable=True),
        sa.Column(
            "client_meta",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_game_saves_user_id", "game_saves", ["user_id"], unique=False)
    op.create_unique_constraint(
        "game_saves_user_slot", "game_saves", ["user_id", "slot"]
    )
    op.create_check_constraint(
        "game_saves_slot_range", "game_saves", "slot >= 1 AND slot <= 3"
    )


def downgrade() -> None:
    op.drop_table("game_saves")
