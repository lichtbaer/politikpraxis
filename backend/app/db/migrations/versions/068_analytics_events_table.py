"""Tabelle analytics_events anlegen + save_id-FK auf ON DELETE SET NULL.

Zwei Befunde aus dem Qualitätsplan (docs/entwicklung/qualitaetsplan.md, 2.2):

1. `analytics_events` wurde von keiner Migration angelegt — Migration 036 passt
   die Tabelle nur „falls vorhanden" an. Gegen eine frisch migrierte DB liefen
   `app.models.analytics.AnalyticsEvent` und POST /api/analytics/batch damit ins
   Leere (relation does not exist), analog zu #254 für `mods`.
2. Wo die Tabelle existierte (ältere Instanzen), hatte `save_id` einen FK ohne
   `ON DELETE` → DELETE /api/saves/{slot} scheiterte mit IntegrityError (500),
   sobald für den Spielstand Analytics-Events vorlagen.

Idempotent: legt die Tabelle nur an, wenn sie fehlt; ersetzt sonst nur den FK.

Revision ID: 068_analytics_events
Revises: 067_char_beziehungen_sma279
Create Date: 2026-09-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "068_analytics_events"
down_revision: Union[str, Sequence[str], None] = "067_char_beziehungen_sma279"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "analytics_events"


def _table_exists(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _drop_save_id_fks() -> None:
    rows = (
        op.get_bind()
        .execute(
            sa.text(
                """
                SELECT tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public'
                  AND tc.table_name = :tbl
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'save_id'
                """
            ),
            {"tbl": TABLE},
        )
        .fetchall()
    )
    for (name,) in rows:
        op.drop_constraint(name, TABLE, type_="foreignkey")


def upgrade() -> None:
    if not _table_exists(TABLE):
        op.create_table(
            TABLE,
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
            sa.Column(
                "save_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey(
                    "game_saves.id",
                    ondelete="SET NULL",
                    name="analytics_events_save_id_fkey",
                ),
                nullable=True,
            ),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column(
                "payload",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("game_month", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_analytics_events_user_id", TABLE, ["user_id"])
        op.create_index("ix_analytics_events_event_type", TABLE, ["event_type"])
        op.create_index("ix_analytics_events_save_id", TABLE, ["save_id"])
        return

    # Bestehende Tabelle: FK auf save_id durch SET-NULL-Variante ersetzen.
    _drop_save_id_fks()
    op.create_foreign_key(
        "analytics_events_save_id_fkey",
        TABLE,
        "game_saves",
        ["save_id"],
        ["id"],
        ondelete="SET NULL",
    )
    existing_indexes = {
        ix["name"] for ix in sa.inspect(op.get_bind()).get_indexes(TABLE)
    }
    if "ix_analytics_events_save_id" not in existing_indexes:
        op.create_index("ix_analytics_events_save_id", TABLE, ["save_id"])


def downgrade() -> None:
    # Die Tabelle bleibt bestehen (Datenverlust vermeiden); nur der FK wird auf
    # die Variante ohne ON DELETE zurückgesetzt.
    if not _table_exists(TABLE):
        return
    _drop_save_id_fks()
    op.create_foreign_key(
        "analytics_events_save_id_fkey",
        TABLE,
        "game_saves",
        ["save_id"],
        ["id"],
    )
