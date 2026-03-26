"""Shared model utilities (locale enum type)."""

from sqlalchemy.dialects.postgresql import ENUM as PgEnum

locale_type = PgEnum("de", "en", name="content_locale", create_type=False)
