#!/usr/bin/env python3
"""Balance-Report: Vergleicht alle Strategien und gibt Balance-Empfehlungen aus.

Ausführung:
  cd backend && python -m tests.simulation.balance_report

Oder mit weniger Durchläufen (schneller):
  cd backend && python -m tests.simulation.balance_report --n 200
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .monte_carlo import monte_carlo
from .strategien import alle_strategien


def erstelle_balance_report(n: int = 500, parallel: bool = True) -> dict:
    """Vergleicht alle Strategien und gibt Balance-Empfehlungen aus."""
    strategien = alle_strategien()
    report = {}

    for name, _ in strategien.items():
        print(f"Simuliere {name}...", flush=True)
        report[name] = monte_carlo(name, n=n, parallel=parallel)

    _check_gewinnraten(report)
    _check_haushalt_crashes(report)
    _check_extremwerte(report)

    return report


def _check_gewinnraten(report: dict) -> None:
    """Warnt wenn Gewinnrate < 20% oder > 80% bei einer Strategie."""
    print("\n--- Gewinnraten ---")
    for name, r in report.items():
        rate = r["gewinn_rate"]
        if rate < 0.20:
            print(f"⚠️  {name}: Gewinnrate {rate:.0%} — zu schwer!")
        elif rate > 0.80:
            print(f"⚠️  {name}: Gewinnrate {rate:.0%} — zu leicht!")
        else:
            print(f"✅ {name}: Gewinnrate {rate:.0%} — ok")


def _check_haushalt_crashes(report: dict) -> None:
    """Warnt bei hoher Crash-Rate."""
    print("\n--- Crashes ---")
    for name, r in report.items():
        crashes = r.get("crashes", 0)
        n = r.get("n", 1)
        if crashes > 0:
            print(f"⚠️  {name}: {crashes}/{n} Crashes ({100 * crashes / n:.1f}%)")
        else:
            print(f"✅ {name}: Keine Crashes")


def _check_extremwerte(report: dict) -> None:
    """Prüft extreme Saldo-Werte."""
    print("\n--- Saldo-Statistiken ---")
    for name, r in report.items():
        saldo = r.get("saldo", {})
        median = saldo.get("median", 0)
        min_s = saldo.get("min", 0)
        max_s = saldo.get("max", 0)
        print(f"  {name}: median={median:.1f}, min={min_s:.1f}, max={max_s:.1f}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Balance-Report für Bundesrepublik")
    parser.add_argument(
        "--n", type=int, default=500, help="Anzahl Simulationen pro Strategie"
    )
    parser.add_argument(
        "--no-parallel", action="store_true", help="Keine Parallelisierung"
    )
    parser.add_argument("--output", "-o", type=str, help="JSON-Report speichern")
    args = parser.parse_args()

    report = erstelle_balance_report(n=args.n, parallel=not args.no_parallel)

    # JSON-Output für CI
    output_data = {
        "n": args.n,
        "strategien": {
            name: {
                "gewinn_rate": r["gewinn_rate"],
                "wahlprognose": r["wahlprognose"],
                "saldo": r["saldo"],
                "crashes": r.get("crashes", 0),
            }
            for name, r in report.items()
        },
    }

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json.dumps(output_data, indent=2), encoding="utf-8")
        print(f"\nReport gespeichert: {out_path}")
    else:
        # Standard: balance_report.json im Projekt-Root (workspace)
        root = (
            Path(__file__).resolve().parents[3]
        )  # backend/tests/simulation -> workspace
        out_path = root / "balance_report.json"
        out_path.write_text(json.dumps(output_data, indent=2), encoding="utf-8")
        print(f"\nReport gespeichert: {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
