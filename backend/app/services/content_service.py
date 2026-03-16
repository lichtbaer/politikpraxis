import os
from pathlib import Path
from functools import lru_cache
from typing import Any

import yaml

from app.config import get_settings

settings = get_settings()


def _load_yaml(filepath: str) -> Any:
    with open(filepath, "r", encoding="utf-8") as f:
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


@lru_cache
def load_laws() -> list[dict]:
    return _load_yaml(_content_path("laws", "default.yaml"))


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


def get_content_bundle(scenario_id: str = "standard") -> dict:
    scenario = load_scenario(scenario_id)
    return {
        "characters": load_characters(),
        "events": load_events(),
        "charEvents": load_char_events(),
        "laws": load_laws(),
        "bundesrat": load_bundesrat_mps(),
        "scenario": scenario,
    }
