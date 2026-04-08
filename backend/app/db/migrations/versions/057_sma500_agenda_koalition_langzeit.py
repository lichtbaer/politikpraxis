"""SMA-500: Agenda-Ziele, Koalitionsziele, Gesetze Langzeitwirkung.

Revision ID: 057_sma500_agenda_koalition_langzeit
Revises: 056_user_login_lockout
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "057_sma500_agenda_koalition_langzeit"
down_revision: Union[str, Sequence[str], None] = "056_user_login_lockout"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    locale_enum = postgresql.ENUM("de", "en", name="content_locale", create_type=False)

    op.create_table(
        "agenda_ziele",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("kategorie", sa.Text(), nullable=False),
        sa.Column("schwierigkeit", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "partei_filter",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("bedingung_typ", sa.Text(), nullable=False),
        sa.Column(
            "bedingung_param",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )

    op.create_table(
        "agenda_ziele_i18n",
        sa.Column(
            "agenda_ziel_id",
            sa.Text(),
            sa.ForeignKey("agenda_ziele.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("locale", locale_enum, primary_key=True),
        sa.Column("titel", sa.Text(), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_agenda_ziele_i18n_agenda_ziel_id_locale",
        "agenda_ziele_i18n",
        ["agenda_ziel_id", "locale"],
        unique=True,
    )

    op.create_table(
        "koalitions_ziele",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("partner_profil", sa.Text(), nullable=False),
        sa.Column("kategorie", sa.Text(), nullable=False),
        sa.Column("min_complexity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("bedingung_typ", sa.Text(), nullable=False),
        sa.Column(
            "bedingung_param",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("beziehung_malus", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "koalitions_ziele_i18n",
        sa.Column(
            "koalitions_ziel_id",
            sa.Text(),
            sa.ForeignKey("koalitions_ziele.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("locale", locale_enum, primary_key=True),
        sa.Column("titel", sa.Text(), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_koalitions_ziele_i18n_koalitions_ziel_id_locale",
        "koalitions_ziele_i18n",
        ["koalitions_ziel_id", "locale"],
        unique=True,
    )

    op.add_column(
        "gesetze",
        sa.Column("langzeit_score", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "langzeitwirkung_positiv_de",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "gesetze",
        sa.Column(
            "langzeitwirkung_negativ_de",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("gesetze", "langzeitwirkung_negativ_de")
    op.drop_column("gesetze", "langzeitwirkung_positiv_de")
    op.drop_column("gesetze", "langzeit_score")

    op.drop_index(
        "ix_koalitions_ziele_i18n_koalitions_ziel_id_locale",
        table_name="koalitions_ziele_i18n",
    )
    op.drop_table("koalitions_ziele_i18n")
    op.drop_table("koalitions_ziele")

    op.drop_index(
        "ix_agenda_ziele_i18n_agenda_ziel_id_locale",
        table_name="agenda_ziele_i18n",
    )
    op.drop_table("agenda_ziele_i18n")
    op.drop_table("agenda_ziele")
