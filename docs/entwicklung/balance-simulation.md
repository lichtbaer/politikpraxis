# Balance-Simulation (TypeScript, echte Engine)

Die Balance-Simulation testet 23 Spielstrategien gegen die echte Game-Engine (`frontend/src/core/engine.ts`). Im Gegensatz zur früheren Python-Replik werden hier exakt die gleichen Funktionen (`tick()`, `einbringen()`, etc.) wie im Browser genutzt.

---

## Übersicht

| Komponente | Beschreibung |
|------------|--------------|
| `frontend/src/core/simulation/balanceSim.ts` | Simulations-Runner, Monte-Carlo-Aggregation |
| `frontend/src/core/simulation/strategien.ts` | 23 Strategie-Definitionen (random, musterschueler, etc.) |
| `frontend/src/core/simulation/testContent.ts` | Content-Fixture (Gesetze, Minister, Events) |
| `frontend/src/core/simulation/balanceSim.test.ts` | Vitest-Tests mit Gewinnraten-Prüfung |
| `frontend/scripts/balanceReport.ts` | Report-Generator (Markdown/JSON pro Strategie & Komplexität) |

---

## Ausführung

```bash
cd frontend
npx vitest run src/core/simulation/balanceSim.test.ts --reporter=verbose
```

---

## Balance-Report erzeugen

Für Game-Design-Entscheidungen lässt sich ein lesbarer Report über **alle Strategien**
(`alleStrategien()`) und die **Komplexitätsstufen 1–4** erzeugen:

```bash
cd frontend
npm run balance:report                       # Default: N=200, Komplexität 1-4, Seed 42
npm run balance:report -- --n=25             # schnellerer Lauf (z. B. CI)
npm run balance:report -- --complexity=1,4   # nur ausgewählte Stufen
npm run balance:report -- --json             # zusätzlich JSON neben dem Markdown
npm run balance:report -- --out=../report.md # eigener Ausgabepfad (relativ zu cwd)
```

- **Ausgabe** (Default): `docs/entwicklung/balance-report.md` — eine Tabelle je
  Komplexitätsstufe mit Gewinnrate, Wahlhürden-Rate, Wahlprognose (Median/p10/p90),
  Score-Dimensionen (Gesamt/Bilanz/Agenda/Urteil), Haushaltssaldo, PK-Ende, Monaten
  mit PK < 10, häufigstem Verlustgrund sowie Crash-/Engine-Error-Count.
- **Reproduzierbarkeit:** Der Generator ersetzt `Math.random` durch einen seedbaren
  Mulberry32-PRNG. Gleicher `--seed` ⇒ identischer Report. N und Seed stehen im
  Report-Kopf.
- **Keine Test-Schwellen** im Report — harte Schwellen bleiben in `balanceSim.test.ts`.
- **CI:** `balance-check.yml` erzeugt den Report (kleines N) und lädt ihn als Artefakt
  `balance-report` hoch.

---

## Neue Strategie hinzufügen

1. **Strategie-Funktion in `strategien.ts` definieren:**

   ```typescript
   export function strategieMeineStrategie(state: GameState): StrategyAction {
     const gesetze = verfuegbareGesetze(state);
     if (gesetze.length > 0 && state.pk >= 15) {
       const best = [...gesetze].sort((a, b) => (b.effekte.zf ?? 0) - (a.effekte.zf ?? 0));
       return { typ: 'einbringen', gesetzId: best[0].id };
     }
     return { typ: 'nichts' };
   }
   ```

2. **In `alleStrategien()` registrieren:**

   ```typescript
   export function alleStrategien(): Record<string, Strategy> {
     return {
       // ... bestehende ...
       meine_strategie: strategieMeineStrategie,
     };
   }
   ```

3. **Tests erneut ausführen** — die neue Strategie wird automatisch mit simuliert.

---

## Aktionen

Eine Strategie gibt ein `StrategyAction`-Objekt zurück:

| `typ` | Bedeutung |
|-------|-----------|
| `nichts` | Keine Aktion |
| `einbringen` | Gesetz einbringen (erfordert `gesetzId`) |
| `lobbying` | Lobbying für ein Gesetz (erfordert `gesetzId`) |
| `pressemitteilung` | Pressemitteilung |
| `koalitionsrunde` | Koalitionsrunde (15 PK, +8 Beziehung) |

---

## CI

Der GitHub-Actions-Job `Balance Check` läuft bei Änderungen an:

- `backend/app/content/**`
- `frontend/src/core/**`
