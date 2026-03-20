"""SMA-343: game_stats für Community-Statistiken und Highscores.

Revision ID: 039_game_stats_sma343
Revises: 038_password_reset_sma342
Create Date: 2026-03-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "039_game_stats_sma343"
down_revision: Union[str, Sequence[str], None] = "038_password_reset_sma342"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_stats",
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
            nullable=True,
        ),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("partei", sa.Text(), nullable=False),
        sa.Column("complexity", sa.Integer(), nullable=False),
        sa.Column("gewonnen", sa.Boolean(), nullable=False),
        sa.Column("wahlprognose", sa.Numeric(5, 2), nullable=False),
        sa.Column("monate_gespielt", sa.Integer(), nullable=False),
        sa.Column("gesetze_beschlossen", sa.Integer(), nullable=True),
        sa.Column("gesetze_gescheitert", sa.Integer(), nullable=True),
        sa.Column("koalitionsbruch", sa.Boolean(), server_default="false"),
        sa.Column("saldo_final", sa.Numeric(8, 2), nullable=True),
        sa.Column("gini_final", sa.Numeric(5, 2), nullable=True),
        sa.Column("arbeitslosigkeit_final", sa.Numeric(5, 2), nullable=True),
        sa.Column("medienklima_final", sa.Integer(), nullable=True),
        sa.Column("skandale_gesamt", sa.Integer(), nullable=True),
        sa.Column("pk_verbraucht", sa.Integer(), nullable=True),
        sa.Column("top_politikfeld", sa.Text(), nullable=True),
        sa.Column("bewertung_gesamt", sa.Text(), nullable=True),
        sa.Column("titel", sa.Text(), nullable=True),
        sa.Column("opt_in_community", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_game_stats_user_id", "game_stats", ["user_id"])
    op.create_index("ix_game_stats_session_id", "game_stats", ["session_id"])
    op.create_index(
        "ix_game_stats_community",
        "game_stats",
        ["partei", "gewonnen", "complexity"],
        postgresql_where=sa.text("opt_in_community = true"),
    )


def downgrade() -> None:
    op.drop_index("ix_game_stats_community", table_name="game_stats")
    op.drop_index("ix_game_stats_session_id", table_name="game_stats")
    op.drop_index("ix_game_stats_user_id", table_name="game_stats")
    op.drop_table("game_stats")
