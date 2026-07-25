"""Fix eu_events_i18n/eu_event_choices_i18n.locale: varchar(5) -> content_locale enum (#343)

Migration 010_eu_events created these two `locale` columns as plain
`sa.String(5)` instead of the shared `content_locale` Postgres enum used by
every other i18n table (see app/models/_shared.py). The SQLAlchemy models
(app/models/eu.py) always declared `locale_type` (the enum), so every ORM
query against these tables binds `locale = $1::content_locale` — which fails
against the real `character varying` column with
`operator does not exist: character varying = content_locale`. This was
invisible until CI ran against a real Postgres instance (#343), since no
prior CI job executed `@requires_db` tests.

Revision ID: 063_eu_events_locale_enum
Revises: 062_merge_061_heads
Create Date: 2026-07-25

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "063_eu_events_locale_enum"
down_revision: Union[str, Sequence[str], None] = "062_merge_061_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("eu_events_i18n", "eu_event_choices_i18n")


def upgrade() -> None:
    """Convert locale columns from varchar(5) to the content_locale enum."""
    for table in _TABLES:
        op.execute(
            f"ALTER TABLE {table} "
            f"ALTER COLUMN locale TYPE content_locale USING locale::content_locale"
        )


def downgrade() -> None:
    """Convert locale columns back to varchar(5)."""
    for table in _TABLES:
        op.execute(
            f"ALTER TABLE {table} "
            f"ALTER COLUMN locale TYPE VARCHAR(5) USING locale::text"
        )
