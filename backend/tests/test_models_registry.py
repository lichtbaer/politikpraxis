"""Vollständigkeit der Modell-Registry und des Migrations-Schemas.

Hintergrund (Qualitätsplan 2.2): `alembic/env.py` importierte nur 34 von 45
Tabellen, und `analytics_events` wurde von keiner Migration angelegt — beides
fiel nie auf, weil nichts die Modelle gegen Metadata bzw. DB abglich.
"""

import importlib
import pkgutil

import pytest
import sqlalchemy as sa
from app.db.database import Base
from tests.conftest import requires_db


def _model_tables_from_modules() -> set[str]:
    """Sammelt `__tablename__` aller Klassen in app.models.* per Modul-Scan
    (unabhängig davon, was `app.models.__init__` importiert)."""
    import app.models as models_pkg

    tables: set[str] = set()
    for info in pkgutil.iter_modules(models_pkg.__path__):
        module = importlib.import_module(f"app.models.{info.name}")
        for obj in vars(module).values():
            tablename = getattr(obj, "__tablename__", None)
            if isinstance(obj, type) and isinstance(tablename, str):
                tables.add(tablename)
    return tables


def test_all_model_tables_are_registered_in_metadata():
    """Jedes Modell-Modul muss über app.models importiert werden, damit Alembic
    (target_metadata = Base.metadata) es kennt."""
    import app.models  # noqa: F401  — löst die Registrierung aus

    expected = _model_tables_from_modules()
    registered = set(Base.metadata.tables)
    missing = expected - registered
    assert not missing, f"Nicht in Base.metadata registriert: {sorted(missing)}"


def test_models_all_matches_exports():
    """`__all__` darf keine Namen enthalten, die es nicht gibt."""
    import app.models as models_pkg

    for name in models_pkg.__all__:
        assert hasattr(models_pkg, name), name


@pytest.mark.asyncio
@requires_db
async def test_every_model_table_exists_after_migrations():
    """Nach `alembic upgrade head` (CI: backend-pytest-db) muss jede Modell-
    Tabelle in der DB existieren — fängt Tabellen, die nie eine Migration bekamen
    (wie `mods` vor #254 und `analytics_events` vor 068)."""
    import app.models  # noqa: F401
    from app.db.database import engine

    await engine.dispose()
    async with engine.connect() as conn:
        rows = await conn.execute(
            sa.text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            )
        )
        existing = {r[0] for r in rows}
    missing = set(Base.metadata.tables) - existing
    assert not missing, f"Modell-Tabellen ohne Migration: {sorted(missing)}"


@pytest.mark.asyncio
@requires_db
async def test_analytics_save_id_fk_is_set_null():
    """068: Löschen eines Spielstands darf nicht an Analytics-Events scheitern."""
    from app.db.database import engine

    await engine.dispose()
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                sa.text(
                    """
                    SELECT rc.delete_rule
                    FROM information_schema.referential_constraints rc
                    JOIN information_schema.key_column_usage kcu
                      ON rc.constraint_name = kcu.constraint_name
                    WHERE kcu.table_name = 'analytics_events'
                      AND kcu.column_name = 'save_id'
                    """
                )
            )
        ).fetchone()
    assert row is not None, "FK analytics_events.save_id fehlt"
    assert row[0] == "SET NULL"
