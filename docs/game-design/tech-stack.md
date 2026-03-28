# Technischer Stack (Spiel)

---

## 6.1 Aktuell

- **Frontend:** React 19, TypeScript (strict), Vite, Zustand, Phaser (wo genutzt), i18next/react-i18next, TanStack Query, react-router-dom, CSS Modules
- **Backend:** FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, Pydantic
- **Infrastruktur:** Docker, PostgreSQL 16, nginx

**Spielzustand:** Läuft im **Zustand-Store** (`frontend/src/store/gameStore.ts`); reine Logik in `frontend/src/core/` (Engine, Systeme, Typen). Komplexitätsabhängige Mechaniken schalten über `featureActive(complexity, key)` in `frontend/src/core/systems/features.ts`.

Architektur-Details: [Entwicklung → Architektur](../entwicklung/architektur.md), Projektüberblick: [Projektstruktur](../entwicklung/projektstruktur.md).

---

## 6.2 Dateistruktur

| Bereich | Pfad (Auszug) |
|---------|----------------|
| Tick & Orchestrierung | `frontend/src/core/engine.ts` |
| Initialzustand, Migration | `frontend/src/core/state.ts` |
| Subsysteme (Parlament, BR, EU, Haushalt, …) | `frontend/src/core/systems/*.ts` |
| Typen (`GameState`, `Law`, …) | `frontend/src/core/types/` (modular) |
| UI / Screens | `frontend/src/ui/` |
| API / Saves | `frontend/src/services/` |

*Historisch:* Geplant war eine reine JS-Struktur mit `engine.js` / `state.js`; umgesetzt ist TypeScript unter `core/` mit demselben fachlichen Schnitt.

---

## 6.3 State-Architektur

Die **maßgebliche Definition** von `GameState` und `ContentBundle` steht in TypeScript:

- **`frontend/src/core/types/state.ts`** — zusammengesetzter Spielzustand
- **`frontend/src/core/types/`** — `law.ts`, `character.ts`, `politics.ts`, `event.ts`, `common.ts`, `wirtschaft.ts`, …

Das folgende Schema ist eine **inhaltliche Übersicht** (keine vollständige API-Liste; optionale Felder sind oft mit `?` im Code markiert).

### Meta & Steuerung

- `month`, `speed`, `speedBeforePause`, `pk`, `view`, `gameOver`, `won`
- `complexity` (1–4), `electionThreshold` (Wahlhürde, z. B. 35–42)
- `tickLog`, ggf. `letzterMonatsDiff` (Monatsbilanz für UI)

### Spieler & Koalition

- `spielerPartei`, `kanzlerName`, `kanzlerGeschlecht`
- `koalitionspartner`, `koalitionsvertragProfil`, `partnerPrioGesetz`, Partner-Widerstand / Veto-Freigabe (`pendingPartnerWiderstand`, …)
- `chars` (Kabinett), Minister-Agenden und -Initiativen

### KPI, Zustimmung, Geschichte

- `kpi`, `kpiPrev`, `kpiStart`, optional `kpiHistory`
- `zust` (Gesamt + Milieu-Sparten laut Typ `Approval`)
- `coalition`, `approvalHistory`, `wahlprognose`

### Gesetze & Parlament

- `gesetze` (`Law` inkl. Status: `entwurf`, `eingebracht`, `aktiv`, `bt_passed`, `blockiert`, `ausweich`, `beschlossen`, …)
- `eingebrachteGesetze` (Ausschuss-Lag → Abstimmung im Tick)
- `gesetzProjekte` (Vorstufen), `pendingGegenfinanzierung`, `gekoppelteGesetze`, Normenkontrolle (`normenkontrollVerfahren`)
- `btStimmenBonus`, Fraktionssitzung (`letzteFraktionssitzungMonat`)

### Bundesrat & Länder

- `bundesrat` (Länderliste), `bundesratFraktionen`, `landBeziehungen`, `pendingBundesratLandEvent`
- `vermittlungAktiv` (Vermittlungsausschuss)

### EU, Haushalt, Wirtschaft

- `eu` (`EUState`: Klima, Ratsvorsitz, aktive Route in drei Phasen, …)
- `haushalt` (`Haushalt`: Einnahmen, Saldo, Konjunkturindex, Schuldenbremse, …)
- `wirtschaft` (`WirtschaftsState`: Sektoren, Makro — ab Stufe 2 relevant)
- Steuerquote / Jahresmarker (`steuerquoteAktionJahr`), ggf. Haushalts-Historien

### Medien & Öffentlichkeit

- `medienKlima`, `medienAkteure`, Cooldowns und Buffs, `opposition`, Skandal-/Presse-Timing

### Events & Effekte

- `activeEvent`, `firedEvents`, `firedCharEvents`, `firedBundesratEvents`, `eventCooldowns`, `pendingFollowups`, `activeEventPool`
- `pending` (zeitverzögerte KPI-/State-Effekte)
- `log`, `ticker`

### Wahlkampf & Sondermechaniken

- `wahlkampfAktiv`, TV-Duell, `legislaturBilanz`, Regierungserklärung / Vertrauensfrage, Misstrauensvotum-Zähler (`lowApprovalMonths`, …)
- `sachverstaendigenrat`, Extremismus-/Verfassungsflags wo relevant

### ContentBundle (nicht Spielstand, sondern geladene Daten)

`ContentBundle` (gleiche Datei `state.ts`): Szenario, Gesetze, Charaktere, Events, Bundesrat-Daten, Milieus, Politikfelder, Verbände, EU-/Medien-Content, optionale dynamische Event-Listen — typischerweise aus der API (`/api/content/game`) oder Defaults.

---

Für neue Mechaniken: zuerst Typen in `frontend/src/core/types/` erweitern, dann `createInitialState` / Migration in `state.ts`, Systemlogik in `systems/`, Aufruf-Reihenfolge in `engine.ts`, ggf. `features.ts` und UI anbinden.
