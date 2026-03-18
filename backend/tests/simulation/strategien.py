"""Strategie-Definitionen für Monte Carlo Balance-Simulationen.

SMA-334: 8 Scripted Scenarios als automatisierte Balance-Tests.
"""
from __future__ import annotations

import random
from typing import Any, Callable

from .headless_runner import SimGameState, _kongruenz


# =============================================================================
# Szenario 1 — Musterschüler (Baseline)
# =============================================================================


def strategie_musterschueler(G: SimGameState, gesetze: list) -> dict:
    """Szenario 1: Ideologisch kohärent, pflegt Verbände, bringt 1 Gesetz pro Quartal ein.
    Soll zuverlässig gewinnen.

    Erwartung: Wahlprognose > 45% in Monat 48, Saldo > -30 Mrd., Koalition > 60%
    """
    if G.pk < 15:
        return {"typ": "nichts"}

    # Quartalsrhythmus: 1 Gesetz pro Quartal (Monat 1, 4, 7, 10, ...)
    quartal = (G.monat - 1) // 3
    gesetze_erwartet = quartal + 1  # Nach Q1: 1, Q2: 2, ...
    bereits_gebracht = len(G.eingebrachte_gesetze)

    if bereits_gebracht < gesetze_erwartet:
        # Ideologisch kongruent für SDP (links)
        verfuegbar = [
            g for g in gesetze
            if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
        ]
        if verfuegbar:
            passend = sorted(verfuegbar, key=lambda g: -_kongruenz(g, "sdp"))
            return {"typ": "gesetz_einbringen", "gesetz_id": passend[0]["id"]}

    # Zwischen Gesetzen: Lobbying/Pressemitteilung pflegen
    if G.pk >= 12 and random.random() < 0.5:
        return {"typ": "lobbying"}
    if G.pk >= 8:
        return {"typ": "pressemitteilung"}

    return {"typ": "nichts"}


# =============================================================================
# Szenario 2 — Sparkommissar
# =============================================================================


def strategie_sparkommissar(G: SimGameState, gesetze: list) -> dict:
    """Szenario 2: Bringt nur Spargesetze ein, maximiert Haushaltssaldo.
    Risiko: Wahlprognose sinkt durch unzufriedene Milieus.
    Invariante: Saldo darf nie auf < -50 fallen.
    """
    return strategie_nur_sparen(G, gesetze)


# =============================================================================
# Szenario 3 — Ausgabenorgie
# =============================================================================
# strategie_nur_ausgaben existiert bereits


# =============================================================================
# Szenario 4 — Koalitionsbrecher
# =============================================================================


def strategie_koalitionsbrecher(G: SimGameState, gesetze: list) -> dict:
    """Szenario 4: Ignoriert alle Minister-Forderungen, lehnt jeden Koalitionskompromiss ab.
    Bringt Gesetze ein die dem Partner (CDP) ideologisch widersprechen.
    Nie Koalitionsrunde — Koalition wird systematisch destabilisiert.

    Erwartung: Koalitionsbruch tritt auf (Monat 24-36).
    """
    # Nie Koalitionsrunde — das ist der Kern
    if G.pk < 15:
        return {"typ": "nichts"}

    verfuegbar = [
        g for g in gesetze
        if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
    ]
    if not verfuegbar:
        return {"typ": "nichts"}

    # Gesetze die dem Partner (CDP) am meisten widersprechen (niedrigste Kongruenz)
    widersprechend = sorted(verfuegbar, key=lambda g: _kongruenz(g, "cdp"))
    return {"typ": "gesetz_einbringen", "gesetz_id": widersprechend[0]["id"]}


# =============================================================================
# Szenario 5 — Medienmogul
# =============================================================================


def strategie_medienmogul(G: SimGameState, gesetze: list) -> dict:
    """Szenario 5: Schickt jede Möglichkeit Pressemitteilungen, maximiert Medienklima.
    Erwartung: Medienklima > 70, Wahlprognose profitiert.
    Invariante: Medienklima bleibt <= 100, PK kann nicht negativ werden.
    """
    if G.pk >= 12:
        return {"typ": "lobbying"}
    if G.pk >= 8:
        return {"typ": "pressemitteilung"}
    return {"typ": "nichts"}


# =============================================================================
# Szenario 6 — Verbands-Freund
# =============================================================================


def strategie_verbands_freund(G: SimGameState, gesetze: list) -> dict:
    """Szenario 6: Erfüllt Verbandsforderungen — Priorität auf Gesetze mit positiven
    Effekten für Gesellschaft (zf, gi). Vereinfacht: Gesetze mit höchstem zf+gi.

    Invariante: Kein Verband triggert Konflikt wenn Beziehung > 60
    (HeadlessRunner hat keine Verbandslogik — hier: positive Gesetze priorisieren).
    """
    verfuegbar = [
        g for g in gesetze
        if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
    ]
    if not verfuegbar or G.pk < 15:
        return {"typ": "nichts"}

    eff = lambda g: (g.get("effekte") or {})
    score = lambda g: eff(g).get("zf", 0) + eff(g).get("gi", 0) * 0.5
    best = sorted(verfuegbar, key=score, reverse=True)
    return {"typ": "gesetz_einbringen", "gesetz_id": best[0]["id"]}


# =============================================================================
# Szenario 7 — Passivregierung (Stress-Test)
# =============================================================================
# strategie_pk_horten existiert bereits


# =============================================================================
# Szenario 8 — Speed-Runner
# =============================================================================


def strategie_speed_runner(G: SimGameState, gesetze: list) -> dict:
    """Szenario 8: Bringt so früh wie möglich so viele Gesetze ein wie möglich.
    PK sofort ausgeben.

    Erwartung: Viele Gesetze früh beschlossen, aber PK-Mangel in Monat 20+
    Invariante: PK-Regeneration schützt vor dauerhaft leerem PK.
    """
    verfuegbar = [
        g for g in gesetze
        if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
    ]
    if verfuegbar and G.pk >= 15:
        return {"typ": "gesetz_einbringen", "gesetz_id": verfuegbar[0]["id"]}
    return {"typ": "nichts"}


# =============================================================================
# Basis-Strategien (Monte Carlo, Invarianten)
# =============================================================================


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
    """Alle Strategien für den Balance-Report und SMA-334 Scripted Scenarios."""
    return {
        # Monte Carlo / Random
        "random": strategie_random,
        "immer_einbringen": strategie_immer_einbringen,
        "nur_sparen": strategie_nur_sparen,
        "nur_ausgaben": strategie_nur_ausgaben,
        "pk_horten": strategie_pk_horten,
        "ideologisch_sdp": strategie_ideologisch_sdp,
        "ideologisch_cdp": strategie_ideologisch_cdp,
        # SMA-334: 8 Scripted Scenarios
        "musterschueler": strategie_musterschueler,
        "sparkommissar": strategie_sparkommissar,
        "koalitionsbrecher": strategie_koalitionsbrecher,
        "medienmogul": strategie_medienmogul,
        "verbands_freund": strategie_verbands_freund,
        "speed_runner": strategie_speed_runner,
    }
