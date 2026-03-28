import os
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

from app.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

settings = get_settings()


def _load_yaml(filepath: str) -> Any:
    with open(filepath, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _content_path(*parts: str) -> str:
    return os.path.join(settings.content_dir, *parts)


@lru_cache
def load_characters() -> list[dict]:
    return _load_yaml(_content_path("characters", "default.yaml"))


def load_bundesrat_mps() -> list[dict]:
    path = _content_path("characters", "bundesrat_mps.yaml")
    if os.path.exists(path):
        return _load_yaml(path)
    return []


@lru_cache
def load_events() -> list[dict]:
    return _load_yaml(_content_path("events", "random.yaml"))


def load_char_events() -> dict[str, dict]:
    path = _content_path("events", "char_ultimatums.yaml")
    if os.path.exists(path):
        data = _load_yaml(path)
        return {ev["id"]: ev for ev in data} if data else {}
    return {}


def load_scenario(scenario_id: str = "standard") -> dict:
    path = _content_path("scenarios", f"{scenario_id}.yaml")
    if not os.path.exists(path):
        path = _content_path("scenarios", "standard.yaml")
    return _load_yaml(path)


def load_all_scenarios() -> list[dict]:
    scenario_dir = Path(_content_path("scenarios"))
    scenarios = []
    if scenario_dir.exists():
        for f in scenario_dir.glob("*.yaml"):
            scenarios.append(_load_yaml(str(f)))
    return scenarios


def _gesetz_row_to_bundle_law(d: dict[str, Any]) -> dict[str, Any]:
    """YAML-kompatibles Gesetz-Dict aus fetch_gesetze-Zeile (für Legacy-/bundle)."""
    ja = int(d["bt_stimmen_ja"])
    out: dict[str, Any] = {
        "id": d["id"],
        "titel": d["titel"],
        "kurz": d["kurz"],
        "desc": d["desc"],
        "tags": d["tags"],
        "status": "entwurf",
        "ja": ja,
        "nein": 100 - ja,
        "effekte": d["effekte"],
        "lag": d["effekt_lag"],
    }
    if d.get("locked_until_event"):
        out["locked_until_event"] = d["locked_until_event"]
    return out


async def get_content_bundle_from_db(
    db: "AsyncSession", locale: str, scenario_id: str = "standard"
) -> dict[str, Any]:
    """Content-Bundle mit Gesetzen ausschließlich aus der DB (Single Source of Truth)."""
    from app.services.content_db_service import fetch_gesetze

    scenario = load_scenario(scenario_id)
    laws_raw = await fetch_gesetze(db, locale)
    return {
        "characters": load_characters(),
        "events": load_events(),
        "charEvents": load_char_events(),
        "laws": [_gesetz_row_to_bundle_law(x) for x in laws_raw],
        "bundesrat": load_bundesrat_mps(),
        "scenario": scenario,
        "scenarios": load_all_scenarios(),
    }


def get_content_bundle(scenario_id: str = "standard") -> dict:
    """Synchrones Bundle ohne DB — nur für Tests/CLI; Gesetze sind leer."""
    scenario = load_scenario(scenario_id)
    return {
        "characters": load_characters(),
        "events": load_events(),
        "charEvents": load_char_events(),
        "laws": [],
        "bundesrat": load_bundesrat_mps(),
        "scenario": scenario,
        "scenarios": load_all_scenarios(),
    }
