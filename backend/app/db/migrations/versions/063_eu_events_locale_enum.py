"""#343: eu_events_i18n.locale / eu_event_choices_i18n.locale von varchar(5) auf
content_locale-Enum umstellen — Migration 010 nutzte versehentlich sa.String(5)
statt des Enums, wodurch ORM-Queries mit `locale = $1::content_locale` in
Postgres mit "operator does not exist: character varying = content_locale"
fehlschlagen (nie gegen echtes Postgres getestet, siehe #343).

Revision ID: 063_eu_events_locale_enum
Revises: 062_merge_061_heads
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "063_eu_events_locale_enum"
down_revision: Union[str, Sequence[str], None] = "062_merge_061_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_content_locale = postgresql.ENUM("de", "en", name="content_locale", create_type=False)


def upgrade() -> None:
    op.alter_column(
        "eu_events_i18n",
        "locale",
        existing_type=None,
        type_=_content_locale,
        postgresql_using="locale::content_locale",
    )
    op.alter_column(
        "eu_event_choices_i18n",
        "locale",
        existing_type=None,
        type_=_content_locale,
        postgresql_using="locale::content_locale",
    )


def downgrade() -> None:
    op.alter_column(
        "eu_event_choices_i18n",
        "locale",
        existing_type=_content_locale,
        type_=postgresql.VARCHAR(5),
        postgresql_using="locale::varchar(5)",
    )
    op.alter_column(
        "eu_events_i18n",
        "locale",
        existing_type=_content_locale,
        type_=postgresql.VARCHAR(5),
        postgresql_using="locale::varchar(5)",
    )
