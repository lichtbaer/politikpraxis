#!/usr/bin/env python3
"""Exportiert das OpenAPI-Schema der FastAPI-App deterministisch nach openapi.json.

Single Source of Truth für die Frontend-API-Typen (SMA / Issue #227): Das Frontend
generiert seine Content-Typen aus diesem Schema (openapi-typescript), ein CI-Job
prüft auf Drift.

`app.openapi()` funktioniert unabhängig vom Debug-Gating der exponierten
`/api/openapi.json`-Route. Der Import baut nur den Async-Engine (verbindet nicht) —
es wird keine Datenbank benötigt. DEBUG=true wird gesetzt, damit die
Produktions-Konfigurationsprüfung in get_settings() den Import nicht blockiert.

Exit-Code 0 = Schema geschrieben. Läuft rein im Prozess — kein laufender Server nötig.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Muss VOR dem Import von app.* gesetzt werden: umgeht die Prod-Config-Validierung
# in get_settings() (sichere SECRET_KEY/ADMIN_PASSWORD etc. sind für den reinen
# Schema-Export irrelevant).
os.environ.setdefault("DEBUG", "true")

BACKEND_DIR = Path(__file__).resolve().parents[1]
OUTPUT_PATH = BACKEND_DIR / "openapi.json"

# Import nach dem Setzen der Env-Defaults.
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402


def main() -> int:
    schema = app.openapi()
    # Deterministisch: sortierte Keys + abschließender Newline, damit der
    # git-diff-basierte CI-Drift-Check stabil ist.
    OUTPUT_PATH.write_text(
        json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"OpenAPI-Schema geschrieben: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
