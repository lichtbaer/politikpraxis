"""Strategie-Definitionen für Monte Carlo Balance-Simulationen."""
from __future__ import annotations

import random
from typing import Any, Callable

from .headless_runner import SimGameState, _kongruenz


def strategie_random(G: SimGameState, gesetze: list) -> dict:
    """Wählt zufällig eine Aktion."""
    aktionen = ["nichts", "gesetz_einbringen", "lobbying", "pressemitteilung"]
    a = random.choice(aktionen)
    if a == "gesetz_einbringen":
        verfuegbar = [g for g in gesetze if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")]
        if verfuegbar and G.pk >= 15:
            return {"typ": "gesetz_einbringen", "gesetz_id": random.choice(verfuegbar)["id"]}
        return {"typ": "nichts"}
    else:
        return {"typ": a}


def strategie_immer_einbringen(G: SimGameState, gesetze: list) -> dict:
    """Bringt immer das erste verfügbare Gesetz ein."""
    verfuegbar = [
        g for g in gesetze
        if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
    ]
    if verfuegbar and G.pk >= 15:
        return {"typ": "gesetz_einbringen", "gesetz_id": verfuegbar[0]["id"]}
    return {"typ": "nichts"}


def strategie_nur_sparen(G: SimGameState, gesetze: list) -> dict:
    """Bringt nur Spargesetze ein (pflichtausgaben_delta < 0)."""
    spargesetze = [
        g for g in gesetze
        if g.get("pflichtausgaben_delta", 0) < 0
        and g["id"] not in G.eingebrachte_gesetze
        and not g.get("locked_until_event")
    ]
    if spargesetze and G.pk >= 15:
        return {"typ": "gesetz_einbringen", "gesetz_id": spargesetze[0]["id"]}
    return {"typ": "nichts"}


def strategie_nur_ausgaben(G: SimGameState, gesetze: list) -> dict:
    """Bringt nur teure Ausgaben-Gesetze ein — Worst Case für Haushalt."""
    ausgaben = sorted(
        [
            g for g in gesetze
            if (g.get("kosten_laufend", 0) > 2 or g.get("effekte", {}).get("hh", 0) < -0.3)
            and g["id"] not in G.eingebrachte_gesetze
            and not g.get("locked_until_event")
        ],
        key=lambda g: g.get("kosten_laufend", 0) * 12 + (g.get("effekte", {}).get("hh", 0) or 0) * 10,
    )
    if ausgaben and G.pk >= 15:
        return {"typ": "gesetz_einbringen", "gesetz_id": ausgaben[0]["id"]}
    return {"typ": "nichts"}


def strategie_pk_horten(G: SimGameState, gesetze: list) -> dict:
    """Gibt nie PK aus — testet passive Spielweise."""
    return {"typ": "nichts"}


def _strategie_ideologisch_kongruent(
    G: SimGameState, gesetze: list, partei: str
) -> dict:
    """Wählt immer das ideologisch passendste Gesetz."""
    verfuegbar = [
        g for g in gesetze
        if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
    ]
    if not verfuegbar or G.pk < 15:
        return {"typ": "nichts"}
    passend = sorted(
        verfuegbar,
        key=lambda g: -_kongruenz(g, partei),
    )
    return {"typ": "gesetz_einbringen", "gesetz_id": passend[0]["id"]}


def strategie_ideologisch_sdp(G: SimGameState, gesetze: list) -> dict:
    """Ideologisch kongruent für SDP (links)."""
    return _strategie_ideologisch_kongruent(G, gesetze, "sdp")


def strategie_ideologisch_cdp(G: SimGameState, gesetze: list) -> dict:
    """Ideologisch kongruent für CDP (rechts)."""
    return _strategie_ideologisch_kongruent(G, gesetze, "cdp")


def alle_strategien() -> dict[str, Callable[[SimGameState, list], dict]]:
    """Alle Strategien für den Balance-Report."""
    return {
        "random": strategie_random,
        "immer_einbringen": strategie_immer_einbringen,
        "nur_sparen": strategie_nur_sparen,
        "nur_ausgaben": strategie_nur_ausgaben,
        "pk_horten": strategie_pk_horten,
        "ideologisch_sdp": strategie_ideologisch_sdp,
        "ideologisch_cdp": strategie_ideologisch_cdp,
    }
