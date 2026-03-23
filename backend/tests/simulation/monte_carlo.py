"""Monte Carlo Simulation für Balance-Testing."""

from __future__ import annotations

import concurrent.futures
import statistics
from collections.abc import Callable
from functools import partial

from .headless_runner import HeadlessRunner


def _run_single(seed: int, strategie_name: str, stufe: int) -> dict:
    """Worker für ProcessPoolExecutor — nimmt Strategie-Name (picklbar)."""
    from .strategien import alle_strategien

    strat = alle_strategien().get(strategie_name)
    if not strat:
        return {
            "gewonnen": False,
            "crash": True,
            "error": f"Unbekannte Strategie: {strategie_name}",
        }
    runner = HeadlessRunner(strat, stufe=stufe, seed=seed)
    try:
        return runner.run()
    except Exception as e:
        return {"gewonnen": False, "crash": True, "error": str(e)}


def monte_carlo(
    strategie: Callable | str,
    n: int = 1000,
    stufe: int = 4,
    parallel: bool = True,
) -> dict:
    """Führt N Simulationen durch und aggregiert Ergebnisse.
    strategie: Name (str) oder Callable. Bei Parallel wird Name bevorzugt (picklbar).
    """
    if isinstance(strategie, str):
        strategie_name = strategie
    else:
        from .strategien import alle_strategien

        strategie_name = strategie.__name__
        for name, s in alle_strategien().items():
            if s is strategie:
                strategie_name = name
                break

    seeds = list(range(n))
    if parallel:
        with concurrent.futures.ProcessPoolExecutor() as executor:
            fn = partial(_run_single, strategie_name=strategie_name, stufe=stufe)
            ergebnisse = list(executor.map(fn, seeds))
    else:
        from .strategien import alle_strategien

        strat = alle_strategien()[strategie_name]
        ergebnisse = []
        for seed in seeds:
            runner = HeadlessRunner(strat, stufe=stufe, seed=seed)
            try:
                ergebnisse.append(runner.run())
            except Exception as e:
                ergebnisse.append({"gewonnen": False, "crash": True, "error": str(e)})

    return _aggregiere(ergebnisse, n)


def _aggregiere(ergebnisse: list, n: int) -> dict:
    gewonnen = sum(1 for e in ergebnisse if e.get("gewonnen", False))
    crashes = sum(1 for e in ergebnisse if e.get("crash", False))
    prognosen = [
        e["wahlprognose_final"] for e in ergebnisse if "wahlprognose_final" in e
    ]
    saldi = [e["saldo_final"] for e in ergebnisse if "saldo_final" in e]

    if not prognosen:
        prognosen = [0]
    if not saldi:
        saldi = [0]

    sorted_prog = sorted(prognosen)
    sorted(saldi)

    return {
        "n": n,
        "gewinn_rate": gewonnen / n,
        "wahlprognose": {
            "median": statistics.median(prognosen),
            "mittel": statistics.mean(prognosen),
            "min": min(prognosen),
            "max": max(prognosen),
            "p10": sorted_prog[n // 10] if n >= 10 else sorted_prog[0],
            "p90": sorted_prog[n * 9 // 10] if n >= 10 else sorted_prog[-1],
        },
        "saldo": {
            "median": statistics.median(saldi),
            "min": min(saldi),
            "max": max(saldi),
        },
        "crashes": crashes,
    }
