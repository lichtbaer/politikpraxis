import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool, text
from alembic import context

from app.db.database import Base
from app.models import (  # noqa: F401
    User,
    GameSave,
    AnalyticsEvent,
    Mod,
    MagicLink,
    RefreshToken,
    PasswordResetToken,
)
from app.models.content import (  # noqa: F401
    Partei,
    ParteiI18n,
    Char,
    CharI18n,
    Gesetz,
    GesetzI18n,
    Event,
    EventI18n,
    EventChoice,
    EventChoiceI18n,
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
    Politikfeld,
    PolitikfeldI18n,
    Milieu,
    MilieuI18n,
    Verband,
    VerbandI18n,
    VerbandsTradeoff,
    VerbandsTradeoffI18n,
    MinisterialInitiative,
    MinisterialInitiativeI18n,
    EuKlimaStartwert,
    EuEvent,
    EuEventI18n,
    EuEventChoice,
    EuEventChoiceI18n,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _ensure_alembic_version_column_length(connection) -> None:
    """
    Unsere Alembic-Revision-IDs sind teils länger als 32 Zeichen.
    Ältere DBs haben `alembic_version.version_num` oft als VARCHAR(32) angelegt.
    """
    try:
        table_exists = connection.execute(
            # resolve via search_path (nicht hart auf `public` festnageln)
            text("SELECT to_regclass('alembic_version') IS NOT NULL")
        ).scalar()
        if not table_exists:
            # Leere DB: Alembic würde die Tabelle sonst mit VARCHAR(32) anlegen,
            # was für unsere langen Revision-IDs nicht reicht.
            connection.execute(
                text(
                    "CREATE TABLE alembic_version ("
                    "version_num VARCHAR(128) NOT NULL PRIMARY KEY"
                    ")"
                )
            )
            connection.commit()
            return

        max_len = connection.execute(
            text(
                """
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'alembic_version'
                  AND column_name = 'version_num'
                ORDER BY CASE WHEN table_schema = 'public' THEN 0 ELSE 1 END
                LIMIT 1
                """
            )
        ).scalar()

        # NULL bedeutet i.d.R. TEXT oder nicht-varchar -> ok
        if isinstance(max_len, int) and max_len < 128:
            connection.execute(
                text(
                    "ALTER TABLE alembic_version "
                    "ALTER COLUMN version_num TYPE VARCHAR(128)"
                )
            )
            # DDL läuft in einer impliziten Transaktion -> explizit committen,
            # bevor Alembic seine eigene Migrations-Transaktion startet.
            connection.commit()
    except Exception:
        # Best effort: wenn das fehlschlägt, soll Alembic normal weiterlaufen
        return


def get_url() -> str:
    """DB-URL aus Umgebung (Docker) oder aus alembic.ini (lokal). Sync-URL für Alembic."""
    url = os.environ.get("DATABASE_URL")
    if url:
        # Alembic nutzt synchronen Treiber (psycopg2); asyncpg-URL umschreiben
        if url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return url
    return config.get_main_option("sqlalchemy.url", "")


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = get_url()
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        _ensure_alembic_version_column_length(connection)
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
