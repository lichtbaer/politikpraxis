"""Pytest-Fixtures für Backend-Tests."""

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _db_available() -> bool:
    """Prüft ob PostgreSQL erreichbar ist (sync mit psycopg2)."""
    try:
        import psycopg2

        conn = psycopg2.connect(
            "postgresql://postgres:postgres@localhost:5432/bundesrepublik",
            connect_timeout=2,
        )
        conn.close()
        return True
    except Exception:
        return False


@pytest.fixture
async def client():
    """Async HTTP-Client für API-Tests."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# Marker für DB-abhängige Tests
requires_db = pytest.mark.skipif(
    not _db_available(),
    reason="PostgreSQL nicht erreichbar (localhost:5432)",
)
