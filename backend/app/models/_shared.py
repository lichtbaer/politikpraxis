"""Shared model utilities (locale enum type)."""

from sqlalchemy.dialects.postgresql import ENUM as PgEnum

# Erweiterung auf neue Sprachen (z. B. 'tr', 'ar') erfordert:
#   1. Alembic-Migration: ALTER TYPE content_locale ADD VALUE 'tr';
#   2. VALID_LOCALES in content_db_service.py erweitern
#   3. Übersetzungsdateien unter frontend/public/locales/<lang>/ anlegen
locale_type = PgEnum("de", "en", name="content_locale", create_type=False)
