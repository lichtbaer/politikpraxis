"""Metadaten aus game_state (JSON) für Listenansicht ableiten."""
from typing import Any


def extract_from_game_state(game_state: dict[str, Any]) -> tuple[int | None, str | None, float | None]:
    monat_raw = game_state.get("month")
    monat: int | None
    try:
        monat = int(monat_raw) if monat_raw is not None else None
    except (TypeError, ValueError):
        monat = None

    partei: str | None = None
    sp = game_state.get("spielerPartei")
    if isinstance(sp, dict):
        partei = sp.get("kuerzel") or sp.get("name")
        if isinstance(partei, str):
            partei = partei[:120]
        else:
            partei = None

    wg_raw = game_state.get("wahlprognose")
    wahlprognose: float | None
    try:
        wahlprognose = float(wg_raw) if wg_raw is not None else None
    except (TypeError, ValueError):
        wahlprognose = None

    return monat, partei, wahlprognose
