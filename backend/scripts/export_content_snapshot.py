"""Content-Snapshot für die Balance-Simulation exportieren (bzw. auf Drift prüfen).

Die Monte-Carlo-Simulation im Frontend (`frontend/src/core/simulation/`) soll mit genau
dem Content laufen, den das Spiel über die API bekommt — nicht mit einem handgepflegten
Fixture. Dieses Skript ruft dafür die Content-Endpoints ab, die `contentStore.load` im
Frontend nutzt, und schreibt die Rohantworten nach
`frontend/src/core/simulation/content-snapshot.json`. Das Frontend läuft sie durch
dieselbe Umwandlung (`contentDatenAusApi`) wie im Spiel.

Voraussetzung: migrierte DB (`alembic upgrade head`), `DATABASE_URL` gesetzt.

    python scripts/export_content_snapshot.py           # Snapshot schreiben
    python scripts/export_content_snapshot.py --check   # CI: Abweichung → Exit 1
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

os.environ.setdefault("DEBUG", "1")

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

SNAPSHOT_PATH = (
    BACKEND_DIR.parent
    / "frontend"
    / "src"
    / "core"
    / "simulation"
    / "content-snapshot.json"
)
LOCALE = "de"

# Schlüssel = Feldname in `ContentApiAntworten` (frontend/src/store/contentStore.ts)
ENDPOINTS: dict[str, str] = {
    "chars": "/api/content/chars",
    "gesetze": "/api/content/gesetze",
    "events": "/api/content/events",
    "bundesrat": "/api/content/bundesrat",
    "milieus": "/api/content/milieus",
    "politikfelder": "/api/content/politikfelder",
    "verbaende": "/api/content/verbaende",
    "gesetzRelationen": "/api/content/gesetz-relationen",
    "medienAkteure": "/api/content/medien-akteure",
    "bundeslaender": "/api/content/bundeslaender",
    "agendaZiele": "/api/content/agenda-ziele",
    "koalitionsZiele": "/api/content/koalitions-ziele",
    "euEvents": "/api/content/eu-events",
}


def _sortiert(items: list[Any]) -> list[Any]:
    """Top-Level-Listen stabil sortieren — die API garantiert nicht überall ein ORDER BY."""

    def key(item: Any) -> str:
        if isinstance(item, dict) and "id" in item:
            return str(item["id"])
        return json.dumps(item, sort_keys=True, ensure_ascii=False)

    return sorted(items, key=key)


async def _abrufen() -> dict[str, list[Any]]:
    from app.db.database import engine
    from app.main import app
    from httpx import ASGITransport, AsyncClient

    # DEBUG=1 (s. o.) schaltet SQL-Echo an — für den Export nur Rauschen.
    engine.echo = False

    antworten: dict[str, list[Any]] = {}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://snapshot"
    ) as client:
        for feld, pfad in ENDPOINTS.items():
            r = await client.get(pfad, params={"locale": LOCALE})
            if r.status_code != 200:
                raise SystemExit(f"{pfad}: HTTP {r.status_code} — DB migriert?")
            daten = r.json()
            if not isinstance(daten, list):
                raise SystemExit(
                    f"{pfad}: erwartet Liste, bekam {type(daten).__name__}"
                )
            antworten[feld] = _sortiert(daten)
    return antworten


def _serialisieren(antworten: dict[str, list[Any]]) -> str:
    return json.dumps(antworten, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="nur vergleichen; Exit 1, wenn der committete Snapshot veraltet ist",
    )
    args = parser.parse_args()

    inhalt = _serialisieren(asyncio.run(_abrufen()))

    if args.check:
        bisher = (
            SNAPSHOT_PATH.read_text(encoding="utf-8") if SNAPSHOT_PATH.exists() else ""
        )
        if bisher != inhalt:
            print(
                "Content-Snapshot veraltet: Content (Migrationen) geändert, Snapshot nicht.\n"
                "Neu erzeugen mit: cd backend && python scripts/export_content_snapshot.py\n"
                f"und {SNAPSHOT_PATH.relative_to(BACKEND_DIR.parent)} committen.",
                file=sys.stderr,
            )
            return 1
        print("Content-Snapshot aktuell ✓")
        return 0

    SNAPSHOT_PATH.write_text(inhalt, encoding="utf-8")
    anzahl = ", ".join(f"{k}={len(v)}" for k, v in json.loads(inhalt).items())
    print(f"Content-Snapshot geschrieben: {SNAPSHOT_PATH} ({anzahl})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
