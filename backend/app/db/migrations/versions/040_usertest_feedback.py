"""SMA-xxx: usertest_feedback — internes User-Test-Feedback-System.

Revision ID: 040_usertest_feedback
Revises: 039_game_stats_sma343
Create Date: 2026-03-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "040_usertest_feedback"
down_revision: Union[str, Sequence[str], None] = "039_game_stats_sma343"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usertest_feedback",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column(
            "game_stat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("game_stats.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("kontext", sa.Text(), nullable=False),
        sa.Column("bewertung_gesamt", sa.Integer(), nullable=True),
        sa.Column("verstaendlichkeit", sa.Integer(), nullable=True),
        sa.Column("fehler_gemeldet", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("fehler_beschreibung", sa.Text(), nullable=True),
        sa.Column("positives", sa.Text(), nullable=True),
        sa.Column("verbesserungen", sa.Text(), nullable=True),
        sa.Column("sonstiges", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usertest_feedback_session_id", "usertest_feedback", ["session_id"])
    op.create_index("ix_usertest_feedback_user_id", "usertest_feedback", ["user_id"])
    op.create_index("ix_usertest_feedback_kontext", "usertest_feedback", ["kontext"])


def downgrade() -> None:
    op.drop_index("ix_usertest_feedback_kontext", table_name="usertest_feedback")
    op.drop_index("ix_usertest_feedback_user_id", table_name="usertest_feedback")
    op.drop_index("ix_usertest_feedback_session_id", table_name="usertest_feedback")
    op.drop_table("usertest_feedback")
