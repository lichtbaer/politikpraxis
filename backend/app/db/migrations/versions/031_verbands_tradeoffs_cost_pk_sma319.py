"""SMA-319: Verbands-Tradeoffs — cost_pk + medienklima_delta + neue Lobby-Aktionen

Revision ID: 031_verbands_cost_pk
Revises: 030_merge_029_heads
Create Date: 2026-03-18

Jeder Verband min. 2 Aktionen. Neue 15-PK-Lobby-Aktionen für UVB, BVD, PVD, DWV.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "031_verbands_cost_pk"
down_revision: Union[str, Sequence[str], None] = "030_merge_029_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """cost_pk, medienklima_delta, verband_effekte + 4 neue Verbands-Tradeoffs."""
    op.add_column(
        "verbands_tradeoffs",
        sa.Column("cost_pk", sa.Integer(), nullable=True, server_default="0"),
    )
    op.add_column(
        "verbands_tradeoffs",
        sa.Column("medienklima_delta", sa.Integer(), nullable=True, server_default="0"),
    )
    op.add_column(
        "verbands_tradeoffs",
        sa.Column("verband_effekte", postgresql.JSONB(), nullable=True),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text("""
            SELECT setval(
                pg_get_serial_sequence('verbands_tradeoffs', 'id'),
                COALESCE((SELECT MAX(id) FROM verbands_tradeoffs), 0) + 1,
                false
            )
        """)
    )

    # Neue Tradeoffs: vid, tkey, cost_pk, ea, eh, eg, ez, fdd, mk_delta, verband_eff, label, desc
    new_tradeoffs = [
        (
            "uvb",
            "uvb_eu_klima",
            15,
            0,
            0,
            0,
            0,
            0,
            None,
            None,
            "EU-Klimaziele unterstützen (15 PK)",
            "BT-Stimmen für Umwelt-Gesetze +5%.",
        ),
        (
            "bvd",
            "bvd_ganztag",
            15,
            0,
            -0.2,
            0,
            0,
            2,
            None,
            None,
            "Ganztagsschul-Programm (15 PK)",
            "Bundesprogramm für Ganztagsbetreuung.",
        ),
        (
            "pvd",
            "pvd_pflegenotstand",
            15,
            0,
            0,
            0,
            0,
            0,
            3,
            None,
            "Pflegenotstand erklären (15 PK)",
            "Medienklima +3, öffentliche Aufmerksamkeit für Pflege.",
        ),
        (
            "dwv",
            "dwv_ki_regulierung",
            15,
            0,
            0,
            0,
            0,
            0,
            None,
            '{"bdi": 5}',
            "KI-Regulierung verhindern (15 PK)",
            "BdI +5, DWV +10 Beziehung.",
        ),
    ]

    for (
        vid,
        tkey,
        cpk,
        ea,
        eh,
        eg,
        ez,
        fdd,
        mk_delta,
        v_eff,
        label,
        desc,
    ) in new_tradeoffs:
        v_eff_val = v_eff if v_eff else None
        insert_result = conn.execute(
            sa.text("""
                INSERT INTO verbands_tradeoffs (verband_id, tradeoff_key, cost_pk, effekt_al, effekt_hh, effekt_gi, effekt_zf, feld_druck_delta, medienklima_delta, verband_effekte)
                VALUES (:vid, :tkey, :cpk, :ea, :eh, :eg, :ez, :fdd, :mk_delta, CAST(:v_eff AS jsonb))
                RETURNING id
            """),
            {
                "vid": vid,
                "tkey": tkey,
                "cpk": cpk,
                "ea": ea,
                "eh": eh,
                "eg": eg,
                "ez": ez,
                "fdd": fdd,
                "mk_delta": mk_delta or 0,
                "v_eff": v_eff_val if v_eff_val else "null",
            },
        )
        tid = insert_result.scalar_one()
        conn.execute(
            sa.text("""
                INSERT INTO verbands_tradeoffs_i18n (tradeoff_id, locale, label, "desc")
                VALUES (:tid, 'de', :label, :desc)
            """),
            {"tid": tid, "label": label, "desc": desc},
        )


def downgrade() -> None:
    """Entferne neue Tradeoffs und neue Spalten."""
    conn = op.get_bind()
    conn.execute(
        sa.text("""
        DELETE FROM verbands_tradeoffs_i18n
        WHERE tradeoff_id IN (
            SELECT id FROM verbands_tradeoffs
            WHERE tradeoff_key IN ('uvb_eu_klima', 'bvd_ganztag', 'pvd_pflegenotstand', 'dwv_ki_regulierung')
        )
    """)
    )
    conn.execute(
        sa.text("""
        DELETE FROM verbands_tradeoffs
        WHERE tradeoff_key IN ('uvb_eu_klima', 'bvd_ganztag', 'pvd_pflegenotstand', 'dwv_ki_regulierung')
    """)
    )
    op.drop_column("verbands_tradeoffs", "verband_effekte")
    op.drop_column("verbands_tradeoffs", "medienklima_delta")
    op.drop_column("verbands_tradeoffs", "cost_pk")
