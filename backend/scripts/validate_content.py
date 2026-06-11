#!/usr/bin/env python3
"""Content-Kreuzvalidierung für die YAML-Spieldaten unter app/content/.

Prüft Referenz-Integrität, die zur Laufzeit nur still fehlschlägt
(applyMoodChange im Frontend ignoriert unbekannte Char-IDs):

- Event-IDs eindeutig (random.yaml + char_ultimatums.yaml)
- charMood-/loyalty-Referenzen zeigen auf bekannte Charaktere
- followup_event_id / ultimatum.event zeigen auf existierende Events
- unlocks_laws-Referenzen kommen in den DB-Migrationen vor
  (Gesetze leben nur in der DB, laws/default.yaml ist leer)
- effect-Keys sind gültige KPIs (al, hh, gi, zf)
- Bundesrat: 16 Länder, Stimmgewichte summieren zu 69
- Szenarien: vollständige startKPI

Exit-Code 0 = alles konsistent, 1 = Fehler gefunden (CI-tauglich).
Läuft rein dateibasiert — keine Datenbank nötig.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import yaml

BACKEND_DIR = Path(__file__).resolve().parents[1]
CONTENT_DIR = BACKEND_DIR / "app" / "content"
MIGRATIONS_DIR = BACKEND_DIR / "app" / "db" / "migrations" / "versions"

# Events, die nur per Migration 006 in der DB existieren (Ultimatum-Events
# der Stufe-3/4-Minister am/gm/bm) und daher in keiner YAML auftauchen.
DB_ONLY_EVENT_IDS = {"am_ultimatum", "gm_ultimatum", "bm_ultimatum"}

VALID_KPI_KEYS = {"al", "hh", "gi", "zf"}
BUNDESRAT_LAENDER = 16
BUNDESRAT_STIMMEN_GESAMT = 69


def _load(relpath: str) -> Any:
    path = CONTENT_DIR / relpath
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_char_ids() -> set[str]:
    chars = _load("characters/default.yaml") or []
    return {c["id"] for c in chars}


def load_events() -> list[dict]:
    events: list[dict] = list(_load("events/random.yaml") or [])
    events += list(_load("events/char_ultimatums.yaml") or [])
    return events


def _migration_text() -> str:
    parts = []
    for f in sorted(MIGRATIONS_DIR.glob("*.py")):
        parts.append(f.read_text(encoding="utf-8"))
    return "\n".join(parts)


def validate_event_ids_unique(events: list[dict]) -> list[str]:
    errors = []
    seen: set[str] = set()
    for ev in events:
        eid = ev.get("id")
        if not eid:
            errors.append(f"Event ohne id: {ev.get('title', '<unbekannt>')!r}")
        elif eid in seen:
            errors.append(f"Doppelte Event-ID: {eid!r}")
        else:
            seen.add(eid)
    return errors


def validate_char_references(events: list[dict], char_ids: set[str]) -> list[str]:
    errors = []
    for ev in events:
        eid = ev.get("id", "<ohne id>")
        char_id = ev.get("charId")
        if char_id and char_id not in char_ids:
            errors.append(
                f"Event {eid!r}: charId {char_id!r} ist kein bekannter Charakter"
            )
        for i, choice in enumerate(ev.get("choices") or []):
            for field in ("charMood", "loyalty"):
                for cid in choice.get(field) or {}:
                    if cid not in char_ids:
                        errors.append(
                            f"Event {eid!r} Choice {i + 1}: {field}-Referenz "
                            f"{cid!r} ist kein bekannter Charakter"
                        )
    return errors


def validate_event_references(events: list[dict], char_ids: set[str]) -> list[str]:
    errors = []
    event_ids = {ev.get("id") for ev in events} | DB_ONLY_EVENT_IDS
    for ev in events:
        eid = ev.get("id", "<ohne id>")
        for i, choice in enumerate(ev.get("choices") or []):
            follow = choice.get("followup_event_id")
            if follow and follow not in event_ids:
                errors.append(
                    f"Event {eid!r} Choice {i + 1}: followup_event_id "
                    f"{follow!r} existiert nicht"
                )
    chars = _load("characters/default.yaml") or []
    for c in chars:
        ult = (c.get("ultimatum") or {}).get("event")
        if ult and ult not in event_ids:
            errors.append(
                f"Charakter {c['id']!r}: ultimatum.event {ult!r} existiert nicht"
            )
    return errors


def validate_law_references(events: list[dict]) -> list[str]:
    """Gesetze werden ausschließlich per Migration in die DB geseedet —
    eine unlocks_laws-Referenz, die in keiner Migration vorkommt, ist tot."""
    errors = []
    migrations = _migration_text()
    for ev in events:
        eid = ev.get("id", "<ohne id>")
        for i, choice in enumerate(ev.get("choices") or []):
            for law_id in choice.get("unlocks_laws") or []:
                if f'"{law_id}"' not in migrations and f"'{law_id}'" not in migrations:
                    errors.append(
                        f"Event {eid!r} Choice {i + 1}: unlocks_laws "
                        f"{law_id!r} kommt in keiner DB-Migration vor"
                    )
    return errors


def validate_choice_structure(events: list[dict]) -> list[str]:
    errors = []
    for ev in events:
        eid = ev.get("id", "<ohne id>")
        choices = ev.get("choices") or []
        if not choices:
            errors.append(f"Event {eid!r}: keine Choices definiert")
        for i, choice in enumerate(choices):
            for field in ("label", "desc", "cost", "type", "log"):
                if field not in choice:
                    errors.append(
                        f"Event {eid!r} Choice {i + 1}: Pflichtfeld {field!r} fehlt"
                    )
            cost = choice.get("cost")
            if isinstance(cost, (int, float)) and cost < 0:
                errors.append(f"Event {eid!r} Choice {i + 1}: negative Kosten ({cost})")
            for kpi in choice.get("effect") or {}:
                if kpi not in VALID_KPI_KEYS:
                    errors.append(
                        f"Event {eid!r} Choice {i + 1}: effect-Key {kpi!r} "
                        f"ist keine bekannte KPI {sorted(VALID_KPI_KEYS)}"
                    )
    return errors


def validate_bundesrat() -> list[str]:
    errors = []
    laender = _load("characters/bundesrat_mps.yaml") or []
    ids = [land.get("id") for land in laender]
    if len(laender) != BUNDESRAT_LAENDER:
        errors.append(f"Bundesrat: {len(laender)} Länder statt {BUNDESRAT_LAENDER}")
    if len(set(ids)) != len(ids):
        errors.append("Bundesrat: doppelte Länder-IDs")
    stimmen = sum(land.get("votes", 0) for land in laender)
    if stimmen != BUNDESRAT_STIMMEN_GESAMT:
        errors.append(
            f"Bundesrat: Stimmgewichte summieren zu {stimmen} "
            f"statt {BUNDESRAT_STIMMEN_GESAMT}"
        )
    return errors


def validate_scenarios() -> list[str]:
    errors = []
    for path in sorted((CONTENT_DIR / "scenarios").glob("*.yaml")):
        scenario = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        sid = scenario.get("id")
        if sid != path.stem:
            errors.append(f"Szenario {path.name}: id {sid!r} ≠ Dateiname {path.stem!r}")
        kpi_keys = set((scenario.get("startKPI") or {}).keys())
        if kpi_keys != VALID_KPI_KEYS:
            errors.append(
                f"Szenario {path.name}: startKPI hat Keys {sorted(kpi_keys)} "
                f"statt {sorted(VALID_KPI_KEYS)}"
            )
    return errors


def run_all() -> list[str]:
    char_ids = load_char_ids()
    events = load_events()
    errors: list[str] = []
    errors += validate_event_ids_unique(events)
    errors += validate_char_references(events, char_ids)
    errors += validate_event_references(events, char_ids)
    errors += validate_law_references(events)
    errors += validate_choice_structure(events)
    errors += validate_bundesrat()
    errors += validate_scenarios()
    return errors


def main() -> int:
    errors = run_all()
    if errors:
        print(f"Content-Validierung: {len(errors)} Fehler\n")
        for e in errors:
            print(f"  ✗ {e}")
        return 1
    print("Content-Validierung: alle Prüfungen bestanden ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
