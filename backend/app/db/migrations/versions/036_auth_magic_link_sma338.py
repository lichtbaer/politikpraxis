"""SMA-338: Auth — users (minimal), magic_links, refresh_tokens, FK CASCADE

Revision ID: 036_sma338_auth
Revises: 035_merge_034_heads, 035_steuern_sma335
Create Date: 2026-03-20

- users: password_hash nullable, last_login, is_active; Spalte username entfernt
- magic_links, refresh_tokens
- FKs zu users mit ON DELETE CASCADE (bestehende Constraints ersetzen)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "036_sma338_auth"
down_revision: Union[str, Sequence[str], None] = ("035_merge_034_heads", "035_steuern_sma335")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, name: str) -> bool:
    r = conn.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:n"),
        {"n": name},
    )
    return r.scalar() is not None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=:t AND column_name=:c"
        ),
        {"t": table, "c": column},
    )
    return r.scalar() is not None


def _replace_fk_cascade(table: str, column: str, ref_table: str) -> None:
    """Ersetzt FK auf users(id) durch Variante mit ON DELETE CASCADE."""
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public'
              AND tc.table_name = :tbl
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = :col
            """
        ),
        {"tbl": table, "col": column},
    ).fetchall()
    for row in rows:
        op.drop_constraint(row[0], table, type_="foreignkey")
    op.create_foreign_key(
        f"{table}_{column}_fkey",
        table,
        ref_table,
        [column],
        ["id"],
        ondelete="CASCADE",
    )


def upgrade() -> None:
    conn = op.get_bind()

    if not _table_exists(conn, "users"):
        op.create_table(
            "users",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("email", sa.String(255), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)
    else:
        if not _column_exists(conn, "users", "last_login"):
            op.add_column("users", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
        if not _column_exists(conn, "users", "is_active"):
            op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
        if _column_exists(conn, "users", "password_hash"):
            op.alter_column(
                "users",
                "password_hash",
                existing_type=sa.String(255),
                nullable=True,
            )
        if _column_exists(conn, "users", "username"):
            op.drop_column("users", "username")

    if not _table_exists(conn, "magic_links"):
        op.create_table(
            "magic_links",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token", sa.Text(), nullable=False, unique=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_magic_links_user_id", "magic_links", ["user_id"])
        op.create_index("ix_magic_links_token", "magic_links", ["token"], unique=True)

    if not _table_exists(conn, "refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.Text(), nullable=False, unique=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
        op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    # Bestehende Tabellen: CASCADE bei User-Löschung
    if _table_exists(conn, "game_saves") and _column_exists(conn, "game_saves", "user_id"):
        _replace_fk_cascade("game_saves", "user_id", "users")
    if _table_exists(conn, "analytics_events") and _column_exists(conn, "analytics_events", "user_id"):
        _replace_fk_cascade("analytics_events", "user_id", "users")
    if _table_exists(conn, "mods") and _column_exists(conn, "mods", "author_id"):
        _replace_fk_cascade("mods", "author_id", "users")


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("magic_links")
    # users-Schema nicht vollständig zurückdrehen (username fehlt)
