"""Headless Game Runner — 48 Monatsticks ohne UI für Balance-Simulationen.

Repliziert die Frontend-Engine-Logik in Python. Ziel: maximale Geschwindigkeit.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Callable

# Konstanten aus frontend/src/core/constants.ts
PK_REGEN_DIVISOR = 25
PK_REGEN_MIN = 3
PK_MAX = 150
PFLICHTAUSGABEN_BASIS = 370
EINNAHMEN_BASIS = 350
DEFAULT_ELECTION_THRESHOLD = 40
LEGISLATUR_MONATE = 48


@dataclass
class SimGameState:
    """Vereinfachter Spielzustand für Simulation."""
    monat: int = 1
    pk: int = 100
    pk_regen: int = 3
    saldo: float = -20.0
    einnahmen: float = 350.0
    pflichtausgaben: float = 370.0
    gesetz_kosten: float = 0.0
    wahlprognose: float = 52.0
    medienklima: float = 55.0
    koalition: float = 78.0
    arbeitslosigkeit: float = 5.2
    gini: float = 31.2
    zufriedenheit: float = 62.0
    beschlossene_gesetze: list = field(default_factory=list)
    eingebrachte_gesetze: list = field(default_factory=list)
    log: list = field(default_factory=list)
    eingebrachte_ablauf: list = field(default_factory=list)  # {gesetz_id, abstimmung_monat}


# Spargesetze aus Migration 028 (falls nicht in YAML)
_SPARGESETZE_FALLBACK = [
    {"id": "sozialleistungen_kuerzen", "effekte": {"hh": -0.1, "zf": 2, "gi": -0.1}, "lag": 4, "pflichtausgaben_delta": -5.0, "ideologie": {"wirtschaft": 40, "gesellschaft": 30, "staat": 30}},
    {"id": "beamtenbesoldung_einfrieren", "effekte": {"zf": 1}, "lag": 4, "pflichtausgaben_delta": -3.0, "ideologie": {"wirtschaft": 20, "gesellschaft": 10, "staat": 20}},
    {"id": "subventionen_abbau", "effekte": {"hh": -0.1, "zf": 3, "gi": -0.2}, "lag": 4, "einnahmeeffekt": 4.0, "ideologie": {"wirtschaft": -10, "gesellschaft": -30, "staat": -10}},
    {"id": "rente_stabilisierung", "effekte": {"hh": -0.2, "zf": 2, "gi": -0.1}, "lag": 4, "pflichtausgaben_delta": -8.0, "ideologie": {"wirtschaft": 30, "gesellschaft": 20, "staat": 10}},
    {"id": "effizienzprogramm_bund", "effekte": {"zf": 2, "gi": 0.2}, "lag": 4, "kosten_einmalig": -2.0, "pflichtausgaben_delta": -4.0, "ideologie": {"wirtschaft": 10, "gesellschaft": 0, "staat": 20}},
]


def _lade_gesetze() -> list[dict[str, Any]]:
    """Lädt Gesetze aus Content (YAML oder DB)."""
    try:
        from app.services.content_service import load_laws
        laws = load_laws()
    except Exception:
        # Fallback: YAML direkt laden (falls außerhalb Backend-Kontext)
        import os
        import yaml
        path = os.path.join(os.path.dirname(__file__), "..", "..", "app", "content", "laws", "default.yaml")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                laws = yaml.safe_load(f) or []
        else:
            laws = []

    # Spargesetze hinzufügen falls nicht in YAML
    ids_vorhanden = {g.get("id") for g in laws if isinstance(g, dict)}
    for sg in _SPARGESETZE_FALLBACK:
        if sg["id"] not in ids_vorhanden:
            laws.append(sg)

    # Normiere Gesetze: id, effekte, lag, kosten_laufend, pflichtausgaben_delta, ideologie
    result = []
    for g in laws:
        if isinstance(g, dict):
            eff = g.get("effekte") or {}
            ideo = g.get("ideologie") or {"wirtschaft": 0, "gesellschaft": 0, "staat": 0}
            result.append({
                "id": g.get("id", ""),
                "titel": g.get("titel", ""),
                "kurz": g.get("kurz", ""),
                "effekte": eff,
                "lag": g.get("lag", g.get("effekt_lag", 4)),
                "ja": g.get("ja", g.get("bt_stimmen_ja", 50)),
                "kosten_laufend": float(g.get("kosten_laufend", 0)),
                "kosten_einmalig": float(g.get("kosten_einmalig", 0)),
                "einnahmeeffekt": float(g.get("einnahmeeffekt", 0)),
                "pflichtausgaben_delta": float(g.get("pflichtausgaben_delta", 0)),
                "ideologie": ideo if isinstance(ideo, dict) else {"wirtschaft": 0, "gesellschaft": 0, "staat": 0},
                "locked_until_event": g.get("locked_until_event"),
                "min_complexity": g.get("min_complexity", 1),
            })
    return result


def _kongruenz(gesetz: dict, partei: str) -> float:
    """Kongruenz-Score Gesetz vs. Partei (SDP: links, CDP: rechts)."""
    ideo = gesetz.get("ideologie") or {}
    w, g, s = ideo.get("wirtschaft", 0), ideo.get("gesellschaft", 0), ideo.get("staat", 0)
    if partei == "sdp":
        return (w * 0.4 + g * 0.35 + s * 0.25)  # SDP mag positive Werte (links)
    if partei == "cdp":
        return -((w * 0.4 + g * 0.35 + s * 0.25))  # CDP mag negative (rechts)
    return 0


class HeadlessRunner:
    """Führt 48 Monate durch ohne UI."""

    def __init__(self, strategie: Callable, stufe: int = 4, seed: int | None = None):
        self.strategie = strategie
        self.stufe = stufe
        self.seed = seed
        if seed is not None:
            random.seed(seed)

    def run(self) -> dict:
        """Führt einen vollständigen 48-Monats-Durchlauf aus."""
        G = SimGameState()
        gesetze = _lade_gesetze()

        for monat in range(1, LEGISLATUR_MONATE + 1):
            G.monat = monat

            # Strategie entscheidet welche Aktion diese Runde
            aktion = self.strategie(G, gesetze)
            self._verarbeite_aktion(G, aktion, gesetze)

            # Ablaufende Abstimmungen: eingebrachte Gesetze prüfen
            self._abstimmungen_abschliessen(G, gesetze)

            # Monat-Tick
            self._tick(G)

            # Random Events (vereinfacht)
            self._random_events(G)

        return self._berechne_ergebnis(G)

    def _verarbeite_aktion(self, G: SimGameState, aktion: Any, gesetze: list) -> None:
        if isinstance(aktion, dict):
            typ = aktion.get("typ", "nichts")
        else:
            typ = str(aktion) if aktion else "nichts"

        if typ == "gesetz_einbringen":
            gid = aktion.get("gesetz_id")
            if not gid:
                return
            gesetz = next((g for g in gesetze if g["id"] == gid), None)
            if gesetz and gid not in G.eingebrachte_gesetze and G.pk >= 15:
                G.pk -= 15
                G.eingebrachte_gesetze.append(gid)
                lag = gesetz.get("lag", 4)
                G.eingebrachte_ablauf.append({"gesetz_id": gid, "abstimmung_monat": G.monat + lag})
        elif typ == "lobbying" and G.pk >= 12:
            G.pk -= 12
            G.medienklima = min(100, G.medienklima + random.uniform(2, 6))
        elif typ == "pressemitteilung" and G.pk >= 8:
            G.pk -= 8
            G.medienklima = min(100, G.medienklima + random.uniform(1, 4))

    def _abstimmungen_abschliessen(self, G: SimGameState, gesetze: list) -> None:
        """Prüft ob eingebrachte Gesetze in diesem Monat abstimmen."""
        fertig = []
        for e in G.eingebrachte_ablauf:
            if e["abstimmung_monat"] <= G.monat:
                gesetz = next((g for g in gesetze if g["id"] == e["gesetz_id"]), None)
                if gesetz:
                    ja = gesetz.get("ja", 50)
                    if random.random() * 100 < ja:
                        G.beschlossene_gesetze.append(e["gesetz_id"])
                        G.gesetz_kosten += gesetz.get("kosten_laufend", 0) * 12
                        G.gesetz_kosten += gesetz.get("kosten_einmalig", 0)
                        G.pflichtausgaben += gesetz.get("pflichtausgaben_delta", 0)
                        G.einnahmen += gesetz.get("einnahmeeffekt", 0)
                        eff = gesetz.get("effekte") or {}
                        G.zufriedenheit = min(100, G.zufriedenheit + eff.get("zf", 0))
                        G.gini = max(0, G.gini + eff.get("gi", 0))
                        G.arbeitslosigkeit = max(0, G.arbeitslosigkeit + eff.get("al", 0))
                fertig.append(e)
        for e in fertig:
            G.eingebrachte_ablauf.remove(e)

    def _tick(self, G: SimGameState) -> None:
        """Monatlicher Tick — vereinfachte Engine-Logik."""
        G.pk = min(PK_MAX, G.pk + max(PK_REGEN_MIN, G.pk_regen))
        G.saldo = G.einnahmen - G.pflichtausgaben - (G.gesetz_kosten / 12)
        G.wahlprognose += (G.medienklima - 55) * 0.02
        G.wahlprognose = max(0, min(100, G.wahlprognose))
        G.medienklima += (55 - G.medienklima) * 0.05

    def _random_events(self, G: SimGameState) -> None:
        """Vereinfachte Zufalls-Events."""
        if random.random() < 0.08:
            G.wahlprognose += (random.random() - 0.5) * 4
            G.wahlprognose = max(0, min(100, G.wahlprognose))
        if random.random() < 0.05:
            G.medienklima += (random.random() - 0.5) * 6
            G.medienklima = max(0, min(100, G.medienklima))

    def _berechne_ergebnis(self, G: SimGameState) -> dict:
        return {
            "gewonnen": G.wahlprognose >= DEFAULT_ELECTION_THRESHOLD,
            "wahlprognose_final": G.wahlprognose,
            "saldo_final": G.saldo,
            "gesetze_beschlossen": len(G.beschlossene_gesetze),
            "pk_verbraucht": 100 - G.pk + (G.monat * G.pk_regen),
            "koalition_final": G.koalition,
            "log": G.log,
        }
