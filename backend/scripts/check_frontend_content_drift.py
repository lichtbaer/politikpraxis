#!/usr/bin/env python3
"""Drift-Check: Frontend-Offline-Fallback vs. Backend-Content (#244).

`frontend/src/core/simulation/testContent.ts` speist sowohl die
Balance-Simulation als auch — über `FALLBACK_LAWS`/`FALLBACK_CHARS`
(`frontend/src/data/defaults/fallbackContent.ts`) — den Offline-Fallback,
der das Spiel ohne erreichbares Backend startbar macht. Beide Stellen
"spiegeln" laut eigenem Kommentar die echten Backend-Daten, es gibt aber
keine automatische Prüfung dafür.

Dieses Skript prüft, dass jede Gesetz-/Charakter-ID aus `testContent.ts`
serverseitig tatsächlich existiert:

- Gesetz-IDs (`SIM_LAWS`) müssen als String-Literal in den Alembic-Migrationen
  unter `app/db/migrations/versions/` vorkommen (Gesetze leben nur in der DB,
  siehe `laws/default.yaml`). Gleiches Existenz-Prinzip wie
  `validate_content.validate_law_references`.
- Charakter-IDs (`SIM_CHARACTERS`) müssen in `characters/default.yaml`
  vorkommen (der laut eigenem Kommentar dort das volle Kabinett spiegelt).

Das ist eine Existenzprüfung (String kommt irgendwo vor), keine
Feldabgleich-Prüfung (Titel/Effekte/etc.) — dieselbe Einschränkung wie beim
bestehenden `unlocks_laws`-Check in `validate_content.py`: Für einen
vollständigen Feld-Drift-Check bräuchte es den tatsächlichen DB-Zustand
(Migrationen sequenziell angewendet), nicht nur den Migrations-Quelltext.
Das ist Teil von #343 (Postgres-Service in CI) und hier bewusst nicht
mitgelöst.

Exit-Code 0 = kein Drift gefunden, 1 = Fehler gefunden (CI-tauglich).
Läuft rein dateibasiert — keine Datenbank nötig.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import validate_content  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
TEST_CONTENT_PATH = FRONTEND_DIR / "src" / "core" / "simulation" / "testContent.ts"

_ID_RE = re.compile(r"id:\s*'([a-zA-Z0-9_]+)'")


def _extract_block(source: str, const_name: str) -> str:
    match = re.search(
        rf"const\s+{re.escape(const_name)}\s*:[^=]*=\s*\[(.*?)\n\];", source, re.DOTALL
    )
    if not match:
        raise ValueError(f"Konnte Block {const_name!r} in testContent.ts nicht finden")
    return match.group(1)


def load_test_content_law_ids() -> set[str]:
    source = TEST_CONTENT_PATH.read_text(encoding="utf-8")
    block = _extract_block(source, "SIM_LAWS")
    return set(_ID_RE.findall(block))


def load_test_content_char_ids() -> set[str]:
    source = TEST_CONTENT_PATH.read_text(encoding="utf-8")
    block = _extract_block(source, "SIM_CHARACTERS")
    return set(_ID_RE.findall(block))


def validate_law_ids_exist_in_migrations(law_ids: set[str]) -> list[str]:
    migrations = validate_content._migration_text()
    errors = []
    for law_id in sorted(law_ids):
        if f'"{law_id}"' not in migrations and f"'{law_id}'" not in migrations:
            errors.append(
                f"testContent.ts SIM_LAWS: Gesetz-ID {law_id!r} kommt in keiner "
                "DB-Migration vor (Offline-Fallback würde ein Gesetz zeigen, "
                "das serverseitig nie existiert hat)"
            )
    return errors


def validate_char_ids_exist_in_yaml(char_ids: set[str]) -> list[str]:
    known = validate_content.load_char_ids()
    errors = []
    for char_id in sorted(char_ids):
        if char_id not in known:
            errors.append(
                f"testContent.ts SIM_CHARACTERS: Charakter-ID {char_id!r} kommt "
                "nicht in characters/default.yaml vor"
            )
    return errors


def run_all() -> list[str]:
    errors: list[str] = []
    errors += validate_law_ids_exist_in_migrations(load_test_content_law_ids())
    errors += validate_char_ids_exist_in_yaml(load_test_content_char_ids())
    return errors


def main() -> int:
    errors = run_all()
    if errors:
        print(f"Frontend-Content-Drift-Check: {len(errors)} Fehler\n")
        for e in errors:
            print(f"  ✗ {e}")
        return 1
    print("Frontend-Content-Drift-Check: alle Prüfungen bestanden ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
