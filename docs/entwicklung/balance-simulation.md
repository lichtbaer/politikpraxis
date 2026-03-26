# Balance-Simulation (TypeScript, echte Engine)

Die Balance-Simulation testet 13 Spielstrategien gegen die echte Game-Engine (`frontend/src/core/engine.ts`). Im Gegensatz zur früheren Python-Replik werden hier exakt die gleichen Funktionen (`tick()`, `einbringen()`, etc.) wie im Browser genutzt.

---

## Übersicht

| Komponente | Beschreibung |
|------------|--------------|
| `frontend/src/core/simulation/balanceSim.ts` | Simulations-Runner, Monte-Carlo-Aggregation |
| `frontend/src/core/simulation/strategien.ts` | 13 Strategie-Definitionen (random, musterschueler, etc.) |
| `frontend/src/core/simulation/testContent.ts` | Content-Fixture (Gesetze, Minister, Events) |
| `frontend/src/core/simulation/balanceSim.test.ts` | Vitest-Tests mit Gewinnraten-Prüfung |

---

## Ausführung

```bash
cd frontend
npx vitest run src/core/simulation/balanceSim.test.ts --reporter=verbose
```

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
