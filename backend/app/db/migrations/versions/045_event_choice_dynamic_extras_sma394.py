"""SMA-394: Zusatzfelder für Event-Choices (Milieu, Haushalt-Modifikatoren).

Revision ID: 045_event_choice_dynamic_extras_sma394
Revises: 044_sma394_dynamic_events
Create Date: 2026-03-26
"""

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "045_event_choice_dynamic_extras_sma394"
down_revision: Union[str, Sequence[str], None] = "044_sma394_dynamic_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "event_choices",
        sa.Column("milieu_delta", JSONB(), nullable=True),
    )
    op.add_column(
        "event_choices",
        sa.Column("schuldenbremse_spielraum_delta", sa.Integer(), nullable=True),
    )
    op.add_column(
        "event_choices",
        sa.Column("steuerpolitik_modifikator_delta", sa.Numeric(6, 4), nullable=True),
    )
    op.add_column(
        "event_choices",
        sa.Column("konjunktur_index_delta", sa.Numeric(5, 2), nullable=True),
    )

    conn = op.get_bind()

    updates: list[tuple[str, str, dict[str, object]]] = [
        (
            "dyn_wirtschaftskrise_droht",
            "sparpaket",
            {"milieu_delta": {"prekaere": -8}},
        ),
        (
            "dyn_wirtschaftskrise_droht",
            "investieren",
            {"konjunktur_index_delta": 0.5},
        ),
        (
            "dyn_fluechtlingswelle",
            "aufnahme",
            {"milieu_delta": {"postmaterielle": 8, "traditionelle": -8}},
        ),
        (
            "dyn_fluechtlingswelle",
            "restriktiv",
            {"milieu_delta": {"traditionelle": 8, "postmaterielle": -10}},
        ),
        (
            "dyn_naturkatastrophe_inland",
            "notlage",
            {"schuldenbremse_spielraum_delta": 4},
        ),
    ]

    for eid, key, fields in updates:
        set_parts: list[str] = []
        params: dict[str, object] = {"eid": eid, "key": key}
        for col, v in fields.items():
            if col == "milieu_delta":
                set_parts.append("milieu_delta = CAST(:milieu_delta AS jsonb)")
                params["milieu_delta"] = json.dumps(v)
            else:
                set_parts.append(f"{col} = :{col}")
                params[col] = v
        conn.execute(
            sa.text(
                f"UPDATE event_choices SET {', '.join(set_parts)} WHERE event_id = :eid AND choice_key = :key"
            ),
            params,
        )


def downgrade() -> None:
    op.drop_column("event_choices", "konjunktur_index_delta")
    op.drop_column("event_choices", "steuerpolitik_modifikator_delta")
    op.drop_column("event_choices", "schuldenbremse_spielraum_delta")
    op.drop_column("event_choices", "milieu_delta")
