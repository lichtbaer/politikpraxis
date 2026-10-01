# Balance-Simulation (TypeScript, echte Engine)

Die Balance-Simulation testet 26 Spielstrategien gegen die echte Game-Engine (`frontend/src/core/engine.ts`). Im Gegensatz zur früheren Python-Replik werden hier exakt die gleichen Funktionen (`tick()`, `einbringen()`, etc.) wie im Browser genutzt.

---

## Übersicht

| Komponente | Beschreibung |
|------------|--------------|
| `frontend/src/core/simulation/balanceSim.ts` | Simulations-Runner, Monte-Carlo-Aggregation |
| `frontend/src/core/simulation/strategien.ts` | 26 Strategie-Definitionen (random, musterschueler, agenda_fokus, …) |
| `frontend/src/core/simulation/content-snapshot.json` | **Echter Content**: Rohantworten der Content-API aus einer frisch migrierten DB |
| `frontend/src/core/simulation/echterContent.ts` | Baut daraus das ContentBundle — mit derselben Umwandlung wie das Spiel (`contentDatenAusApi`) |
| `frontend/src/core/simulation/testContent.ts` | Kleines Content-Fixture (19 Gesetze) für Engine-Invarianten-Tests |
| `backend/scripts/export_content_snapshot.py` | Erzeugt bzw. prüft (`--check`) den Snapshot |
| `frontend/src/core/simulation/balanceSim.test.ts` | Vitest-Tests mit Gewinnraten-Prüfung |
| `frontend/scripts/balanceReport.ts` | Report-Generator (Markdown/JSON pro Strategie & Komplexität) |

---

## Ausführung

```bash
cd frontend
npx vitest run src/core/simulation/balanceSim.test.ts --reporter=verbose
```

Die Tests ersetzen `Math.random` je Test durch einen geseedeten Mulberry32 (`mulberry32` aus
`core/rng.ts`, Seed 42) — wie der Report. Gewinnraten sind damit reproduzierbar; ein rotes
Zielband bedeutet eine echte Änderung, kein Monte-Carlo-Rauschen.

### Entscheidungsregeln der Sim

Die Sim löst Modals so auf, wie eine umsichtige Spielerin es täte:

- **Gesetzauswahl:** nur Entwürfe, die die Agenda-Ansicht auf der Stufe zeigt
  (`min_complexity`), die einbringbar und finanzierbar sind.
- **Gegenfinanzierung:** erst Optionen ohne Nebenwirkung (`GF_PRAEFERENZ`).
- **Partner-Widerstand (#483):** Hinweis → „Trotzdem“ (−5). Widerstand/Veto → Koalitionsrunde,
  wenn das PK reicht (+8 statt −15); sonst bei Widerstand „Trotzdem“ nur ab Beziehung 65,
  ansonsten verschieben. `SimResult.partnerEntscheidungen` zählt die Fälle.
- **Spieler-Agenda:** wie das Onboarding (siehe unten).

### Zielbänder (Block G, echter Content)

| Stufe | Band |
|---|---|
| 1 | `pk_horten`/`nur_sparen` ≤ 10 %, `random` < 50 %, `agenda_fokus` ≥ 70 % und > Zufall + 30 Pp., `musterschueler` ≥ 60 % |
| 2–4 | `pk_horten` 0 %, `random` ≤ 60 % (#475), `agenda_fokus`/`musterschueler`/`koalitionsmanager` ≥ 60 % |
| 3 → 4 | Für koalitionsbewusste Strategien ist Stufe 4 nicht leichter als Stufe 3 (Toleranz 10 Pp., #483) |

`agenda_fokus` (#484) spielt gezielt auf offene Agenda- und Koalitionsziele: passende Gesetze
für Gesetzesziele, Verbandsgespräche für Verbandsziele, Gesetze mit hoher Milieu-Kongruenz für
Milieuziele; Gesetze, die ein offenes Milieuziel senken würden, meidet sie. Kippt die
Partnerbeziehung unter 40, beruft sie eine Koalitionsrunde ein.

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
npm run balance:report -- --content=test     # Test-Fixture statt echtem Content (Vergleich)
```

### Content: echter Snapshot statt Fixture

Der Report läuft seit Oktober 2026 auf dem **echten Spiel-Content** (115 Gesetze, alle
Zufalls-Events inkl. Story-Arcs, EU-Events). Vorher nutzte er das handgepflegte
`testContent.ts` mit 19 Gesetzen — dessen Zahlen sagten über das echte Spiel wenig aus
(u. a. gewannen dort 22–23 von 25 Strategien auf jeder Stufe).

Der Snapshot enthält die Rohantworten der Content-Endpoints, die `contentStore.load` im
Spiel abruft, und läuft durch dieselbe Umwandlung. Ändert eine Migration den Content,
muss er neu erzeugt werden — die CI (`lint.yml`, Job `backend-pytest-db`) prüft das:

```bash
cd backend
alembic upgrade head                              # frische DB
python scripts/export_content_snapshot.py         # Snapshot neu schreiben, dann committen
python scripts/export_content_snapshot.py --check # nur prüfen (CI)
```

Die Vitest-Blöcke A–F in `balanceSim.test.ts` bleiben auf dem Fixture (Engine-Invarianten,
schnell); Block G prüft die Grundlagen auf echtem Content.

- **Ausgabe** (Default): `docs/entwicklung/balance-report.md` — eine Tabelle je
  Komplexitätsstufe mit Gewinnrate, Wahlhürden-Rate, Wahlprognose (Median/p10/p90),
  beschlossenen Gesetzen (Median), Score-Dimensionen (Gesamt/Bilanz/Agenda/Urteil),
  Haushaltssaldo, PK-Ende, Monaten mit PK < 10, Verlustgrund-Verteilung (top 3, z. B.
  `Bruch 12 · Agenda 5`), längstem Einbringen-Hänger sowie Crash-/Engine-Error-Count.
  Der Verlustgrund stammt aus `state.spielendeGrund` (vorzeitiges Ende) bzw. bei
  regulärem Legislaturende aus `legislaturMisserfolgGrund()` (`kein_gesetz`, `agenda`,
  `punkte`) — keine Heuristik mehr (#482).
- **Spieler-Agenda:** Der Report übergibt eine Wunschliste von drei Zielen. `runSingleSim`
  behält davon wie das Onboarding nur die auf der Stufe für die Partei wählbaren
  (`waehlbareSpielerAgendaZiele`) und kürzt auf `spielerAgendaZielAnzahl(complexity)`
  (Stufe 1–2: zwei, ab Stufe 3: drei). Auf Stufe 1 fällt damit das Milieuziel weg (#475).
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
   export function strategieMeineStrategie(
     state: GameState,
     content: ContentBundle,
     complexity: number,
   ): StrategyAction {
     const gesetze = verfuegbareGesetze(state, content, complexity);
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

`verfuegbareGesetze` liefert nur Gesetze, die die Engine auch einbringen lässt
(`requires`/`excludes`, Verfassungsgericht-Sperre, mindestens eine verfügbare
Gegenfinanzierung). Sonst wählt eine Strategie jeden Monat dasselbe gesperrte Gesetz —
Block G prüft deshalb, dass keine Strategie länger als 6 Monate an einem Gesetz hängt.

### Modals in der Simulation

Wo das Spiel ein Modal öffnet, entscheidet die Sim wie ein Spieler:

| Modal | Entscheidung der Sim |
|-------|----------------------|
| Gegenfinanzierung | erste verfügbare Option in der Reihenfolge Überschuss → Schulden → Ressortkürzung (kleinstes ausreichendes Ressort) → Steuergesetze; ohne Option: abbrechen |
| Partner-Widerstand / Hinweis | „Trotzdem einbringen“ |
| Partner-Veto | Koalitionsrunde (15 PK), danach sofort einbringen; ohne PK: „Später“ |
| Event | günstigste leistbare Option, `safe` vor `primary` vor `danger`; bei Partnerbeziehung < 30 zuerst die Option mit dem besten `koalitionspartnerBeziehung` |

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
