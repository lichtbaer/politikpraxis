# Balance-Simulation (Headless Runner + Monte Carlo)

Der Headless Game Runner führt 48 Monatsticks ohne UI durch und ermöglicht Monte Carlo Simulationen zur systematischen Balance-Prüfung.

---

## Übersicht

| Komponente | Beschreibung |
|------------|--------------|
| `backend/tests/simulation/headless_runner.py` | HeadlessRunner, SimGameState, vereinfachte Engine-Logik |
| `backend/tests/simulation/strategien.py` | Strategie-Definitionen (random, sparen, ausgaben, …) |
| `backend/tests/simulation/monte_carlo.py` | Monte Carlo mit Parallelisierung |
| `backend/tests/simulation/balance_report.py` | Balance-Report mit Schwellenwert-Warnungen |

---

## Ausführung

```bash
cd backend
python -m tests.simulation.balance_report
```

Optionen:

- `--n 500` — Anzahl Simulationen pro Strategie (Standard: 500)
- `--no-parallel` — Ohne Parallelisierung (für Debugging)
- `-o report.json` — Report in angegebene Datei schreiben

---

## Neue Strategie hinzufügen

1. **Strategie-Funktion in `strategien.py` definieren:**

   ```python
   def strategie_meine_strategie(G: SimGameState, gesetze: list) -> dict:
       """Beschreibung der Strategie."""
       verfuegbar = [
           g for g in gesetze
           if g["id"] not in G.eingebrachte_gesetze and not g.get("locked_until_event")
       ]
       if verfuegbar and G.pk >= 15:
           # Deine Logik: z.B. Gesetz mit höchstem zf-Effekt wählen
           best = max(verfuegbar, key=lambda g: g.get("effekte", {}).get("zf", 0))
           return {"typ": "gesetz_einbringen", "gesetz_id": best["id"]}
       return {"typ": "nichts"}
   ```

2. **In `alle_strategien()` registrieren:**

   ```python
   def alle_strategien() -> dict[str, Callable]:
       return {
           # ... bestehende ...
           "meine_strategie": strategie_meine_strategie,
       }
   ```

3. **Balance-Report erneut ausführen** — die neue Strategie wird automatisch mit simuliert.

---

## Aktionen

Eine Strategie gibt ein Dict zurück:

| `typ` | Bedeutung |
|-------|-----------|
| `nichts` | Keine Aktion |
| `gesetz_einbringen` | Gesetz einbringen (erfordert `gesetz_id`, 15 PK) |
| `lobbying` | Lobbying (12 PK, Medienklima steigt) |
| `pressemitteilung` | Pressemitteilung (8 PK) |

---

## Schwellenwerte

Der Balance-Report warnt bei:

- **Gewinnrate < 20%** — Strategie zu schwer
- **Gewinnrate > 80%** — Strategie zu leicht
- **Crashes > 0** — Laufzeitfehler in der Simulation

---

## CI

Der GitHub-Actions-Job `Balance Check` läuft bei Änderungen an:

- `backend/app/content/**`
- `frontend/src/core/**`

Der Report wird als Artifact `balance-report` hochgeladen.
