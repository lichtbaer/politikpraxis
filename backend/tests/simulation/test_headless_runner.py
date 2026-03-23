"""Tests für HeadlessRunner und Monte Carlo."""

from tests.simulation.headless_runner import HeadlessRunner
from tests.simulation.monte_carlo import monte_carlo
from tests.simulation.strategien import (
    strategie_immer_einbringen,
    strategie_pk_horten,
)


def test_headless_runner_pk_horten():
    """PK-Horten: 48 Monate ohne Aktionen."""
    runner = HeadlessRunner(strategie_pk_horten, stufe=4, seed=42)
    result = runner.run()
    assert result["gewonnen"] in (True, False)
    assert "wahlprognose_final" in result
    assert "saldo_final" in result
    assert result["gesetze_beschlossen"] == 0


def test_headless_runner_immer_einbringen():
    """Immer einbringen: sollte Gesetze beschließen."""
    runner = HeadlessRunner(strategie_immer_einbringen, stufe=4, seed=123)
    result = runner.run()
    assert result["gesetze_beschlossen"] >= 0
    assert "wahlprognose_final" in result


def test_monte_carlo_single():
    """Monte Carlo mit wenigen Durchläufen."""
    r = monte_carlo("pk_horten", n=10, parallel=False)
    assert r["n"] == 10
    assert 0 <= r["gewinn_rate"] <= 1
    assert "wahlprognose" in r
    assert "saldo" in r


def test_monte_carlo_parallel():
    """Monte Carlo parallel."""
    r = monte_carlo("nur_sparen", n=20, parallel=True)
    assert r["n"] == 20
    assert r.get("crashes", 0) == 0
