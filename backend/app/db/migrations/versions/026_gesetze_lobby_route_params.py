"""Gesetze: Lobby- und Route-Parameter datengetrieben

Revision ID: 026_lobby_route_params
Revises: 025_bt_stimmen_basis
Create Date: 2026-03-17

Neue Spalten:
- lobby_mood_effekte: JSONB {char_id: mood_delta} bei Lobbying
- lobby_pk_kosten: PK-Kosten pro Lobbying-Aktion (Default 12)
- lobby_gain_range: JSONB {min, max} Zustimmungs-Gain (Default 2-6%)
- route_overrides: JSONB {route: {cost?, dur?}} gesetzspezifische Route-Parameter
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "026_lobby_route_params"
down_revision: Union[str, Sequence[str], None] = "025_bt_stimmen_basis"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add lobby and route parameter columns to gesetze."""
    op.add_column(
        "gesetze",
        sa.Column(
            "lobby_mood_effekte",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "lobby_pk_kosten",
            sa.Integer(),
            nullable=True,
            server_default="12",
        ),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "lobby_gain_range",
            postgresql.JSONB(),
            nullable=True,
            server_default='{"min": 2, "max": 6}',
        ),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "route_overrides",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
    )

    # Seed: Bisheriges hardcoded FM-Mood-Penalty für ee, wb, bp
    op.execute(
        "UPDATE gesetze SET lobby_mood_effekte = '{\"fm\": -1}' "
        "WHERE id IN ('ee', 'wb', 'bp')"
    )


def downgrade() -> None:
    """Remove lobby and route parameter columns from gesetze."""
    op.drop_column("gesetze", "route_overrides")
    op.drop_column("gesetze", "lobby_gain_range")
    op.drop_column("gesetze", "lobby_pk_kosten")
    op.drop_column("gesetze", "lobby_mood_effekte")
