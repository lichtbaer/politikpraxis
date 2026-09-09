# Qualitätsplan (September 2026)

Ergebnis einer Inspektion des gesamten Projekts aus sieben Perspektiven: CI/Release,
Backend, Frontend, Tests, Sicherheit, Content/Game-Design und Betrieb/Doku. Alle
Befunde wurden gegen den Code bzw. gegen echte Läufe (Lint, Typecheck, Build, Tests,
Coverage, CI-Logs) verifiziert. Stand: `main` bei Commit `52eed18`.

**Legende:** ✅ erledigt · ⬜ offen · ❎ geprüft, kein Handlungsbedarf

**Umsetzungsstand (6. September 2026):** Phase 0 ist auf dem Branch `claude/project-quality-plan-y9fqgf` umgesetzt, bis auf die drei Punkte, die Repo-Settings bzw. Merge-Entscheidungen brauchen (GitHub Pages aktivieren, PR-Backlog, Dependabot-Majors). Aus Phase 1 sind die CI-Gates (Build, Coverage, Balance-Split, Backend-Coverage) umgesetzt.

---

## 0. Gesamtbild in fünf Sätzen

1. Die Code-Hygiene ist deutlich überdurchschnittlich: Ruff, Mypy, ESLint und `tsc` sind
   grün, es gibt 0 `type: ignore`, 0 TODO/FIXME im Anwendungscode, 1 023 Frontend- und
   227 Backend-Tests, ein Alembic-Single-Head-Gate und einen API-Typ-Drift-Check.
2. Die Qualität wird aktuell nicht durch schlechten Code, sondern durch **Drift**
   gefährdet: Content liegt vierfach vor, Konfigurationen widersprechen sich
   (drei Python-Versionen), Doku beschreibt eine Pipeline, die es nicht mehr gibt.
3. Mehrere Qualitäts-Gates existieren nur auf dem Papier: Coverage-Schwellen laufen nie in
   CI, `npm run build` läuft erst nach dem Merge, Balance-Assertions sind trivial erfüllbar,
   Sentry ist in Produktion nicht verdrahtet.
4. **`main` ist seit dem 5. September rot** (Trivy findet `msgpack`/`setuptools` im
   Backend-Image). Da `deploy.yml` auf einen grünen Lint-Lauf wartet, wurden alle 17 Merges
   dieses Tages, darunter der cryptography-CVE-Fix, **nicht deployt**. Letzter grüner Lauf
   und damit letztes Deploy: 29. Juli.
5. Es gibt eine Handvoll stiller Korrektheits- und Sicherheitsbugs im Backend, die kein
   Test fängt (nichtdeterministische Event-Choices, locale-loser Cache-Key, ungeschützter
   Schreib-Endpunkt, FK ohne `ondelete`).

Der Plan ist in vier Phasen gegliedert. Phase 0 ist Pflicht und klein. Phase 1 baut die
Gates, die verhindern, dass Phase 2 und 3 wieder verfallen. Die Reihenfolge innerhalb
der Phasen ist eine Empfehlung nach Nutzen pro Aufwand.

---

## 1. Ist-Zustand (gemessen)

| Metrik | Wert | Bewertung |
|---|---|---|
| Frontend LOC (TS/TSX, ohne Tests) | ~43 000, davon 5 100 generiert | – |
| Backend LOC (Python) | ~33 000, davon ~9 000 Seed-Literale in Migrationen | Seeds sind 24 % des Backends |
| ESLint / `tsc -b` / Ruff / Mypy | alle grün | ✅ |
| `mypy --strict app` | 135 Fehler (72× fehlender Rückgabetyp, 52× `dict` ohne Typparameter) | mechanisch behebbar |
| Frontend-Tests | 1 023 Tests, 94 Dateien; `npm run test` dauert ~3 min, davon ~280 s Balance-Sim | Suite ist langsam |
| Frontend-Coverage (core+ui+store) | 52,5 % Statements, 40 % Branches | core ok, ui/store dünn |
| Backend-Tests | 227, davon 61 (27 %) ohne Postgres still übersprungen | ok in `backend-pytest-db`, redundanter Job ohne DB |
| Backend-Coverage | nicht gemessen | ⬜ |
| Zirkuläre Importe (`madge`) | 14, alle über `core/engine.ts` | eine Ursache, 20 Zeilen Fix |
| Store-Aktionen mit Test | 7 von 51 | ⬜ |
| UI-Komponenten mit Test | 10 von 97 | ⬜ |
| Tote Exporte (`knip`-Äquivalent) | ~91, darunter 3 komplette Services, 4 UI-Komponenten | ⬜ |
| Bundle | echarts-vendor 704 kB, index 372 kB, GameView 303 kB (roh); GeoJSON 1,34 MB auf der Startseite | ⬜ |
| i18n-Key-Parität de/en | 2 075 / 2 077, 0 fehlende Keys, aber ungesichert; 2 kaputte Punkt-Keys | ⬜ |
| Alembic | 78 Migrationen, 10 doppelte Nummernpräfixe, 9 Merge-Migrationen | eingehegt durch CI-Gate |
| Offene PRs | 19 (10 Feature-PRs vom selben Tag + 9 Dependabot) | WIP-Limit fehlt |
| Python-Version | pyproject `>=3.13`, CI `3.12`, Dockerfile `3.14` | ⬜ hoch |
| Git-Tags / Releases / CHANGELOG / LICENSE | keine | ⬜ |
| Lokale Gates (pre-commit, Prettier, editorconfig) | keine | ⬜ |

---

## 2. Phase 0 — Sofort (1 bis 2 Tage): Deploy-Pfad und stille Bugs

Ziel: `main` wieder grün und deploybar, offensichtliche Korrektheits- und
Sicherheitslücken schließen. Alles hier ist klein und unabhängig voneinander.

### 2.1 CI und Release

| Status | Maßnahme | Ort | Aufwand |
|---|---|---|---|
| ✅ | **Trivy-Failure beheben**: `pip install --upgrade pip setuptools` im Backend-Image (msgpack kommt als pip-Vendor mit, setuptools 70.3 ist CVE-2025-47273). PR #423 liegt bereits vor und sollte als Erstes gemergt werden. *(Korrektur: die Funde stammen aus `pip/_vendor/vendor.txt` der jeweils aktuellen pip-Version, ein pip-Upgrade allein reicht nicht, #423 bleibt deshalb rot. Umgesetzt: setuptools aktualisieren und pip/wheel nach der Installation aus dem Runtime-Image entfernen.)* | `backend/Dockerfile` | S |
| ⬜ | **Docs-Deploy repariert**: `actions/deploy-pages` bekommt 404, weil GitHub Pages im Repo nicht aktiviert ist. Entweder Pages aktivieren (Settings → Pages → Source „GitHub Actions“) oder den `deploy`-Job hinter `vars.DOCS_PAGES_ENABLED == 'true'` stellen. Ein dauerhaft roter Workflow trainiert alle darauf, Rot zu ignorieren. | Repo-Settings, `.github/workflows/docs.yml` | S |
| ✅ | **Python-Version vereinheitlichen** auf 3.13: alle `setup-python` in `lint.yml` und `docs.yml`, `backend/Dockerfile` auf `python:3.13-slim`, README/setup.md nachziehen. Produktion läuft heute auf einer Version, die nirgends getestet wird. | 4 Dateien | S |
| ⬜ | **PR-Backlog abbauen**: 10 Feature-PRs vom selben Tag (#415–#426) sind Konfliktkandidaten untereinander (mehrere refactoren `core/systems/`). Reihenfolge festlegen: erst #417/#415 (Struktur), dann Inhalt. Danach WIP-Limit: max. 3 offene Feature-PRs. | GitHub | M |
| ⬜ | Dependabot-Majors (#431–#436, #429) einzeln prüfen; eslint 10 ist laut `dependabot.yml`-Kommentar durch `eslint-plugin-jsx-a11y` blockiert und sollte geschlossen werden. | GitHub | S |

### 2.2 Backend: stille Bugs (jeweils wenige Zeilen, aber Test dazu)

| Status | Maßnahme | Ort |
|---|---|---|
| ✅ | `ORDER BY choice_id` in der `event_choices_i18n`-Query; Choice-Index aus der Choice-ID statt aus der Einfügereihenfolge ableiten. Ohne das können Antwortoptionen eines Events vertauscht werden, und der `contentVersion`-Hash ist instabil. | `content_db_service.py:1084-1096` |
| ✅ | Cache-Key `("gesetz_relationen", "all")` → `("gesetz_relationen", locale)`. Heute vergiftet der erste Client die Sprache aller anderen für 60 s. | `content_db_service.py:1225` |
| ✅ | `analytics_events.save_id`: `ondelete="SET NULL"` plus Migration. Löschen eines Spielstands mit Analytics-Events liefert heute 500. *Zusatzbefund: die Tabelle wurde von keiner Migration angelegt (036 änderte sie nur „falls vorhanden“); Migration 068 legt sie idempotent an.* | `models/analytics.py:23` |
| ✅ | `event_type` als `Literal["random","char_ultimatum","bundesrat"]` validieren; der Prozess-Cache wächst sonst pro beliebigem `?type=`-Wert unbegrenzt. Cache auf `TTLCache(maxsize=…)` umstellen. *(umgesetzt als Muster `^[a-z][a-z0-9_]{0,31}$`, da die Typen nicht sauber enumerierbar sind; Cache auf 128 Einträge begrenzt)* | `routes/content.py:122`, `content_db_service.py:57-80` |
| ✅ | `POST /api/stats` bekommt `@limiter.limit`, Highscore-Einträge ohne `user_id` werden aus `/stats/highscores` ausgeschlossen. *(Rate-Limit 10/h umgesetzt; der Ausschluss anonymer Einträge aus den Highscores ist eine Produktentscheidung und bleibt offen)* | `routes/stats.py:25` |
| ✅ | Admin-Routen in `usertest_feedback.py` (`/admin/usertest-feedback*`) in den Admin-Router mit `admin_rate_limit` + `admin_audit_log` ziehen. | `routes/usertest_feedback.py:98,139` |
| ✅ | `alembic/env.py` importiert nur 34 von 45 Tabellen. Ein `--autogenerate` würde `game_stats`, `usertest_feedback`, `medien_akteure`, `bundeslaender`, `agenda_ziele` u. a. als „zu löschen“ vorschlagen. `app/models/__init__.py` vervollständigen und in `env.py` `import app.models` nutzen. | `app/db/migrations/env.py:8-47` |
| ✅ | `docker-compose.prod.yml`: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `LOG_JSON`, `COOKIE_SECURE`, `FEEDBACK_RECIPIENT`, `DB_POOL_*` durchreichen; `VITE_SENTRY_DSN` als Build-Arg. Sentry ist heute in Produktion faktisch aus, obwohl Code und Doku vollständig sind. | `docker-compose.prod.yml:12-31,40-42` |
| ✅ | Cache-Header in beiden Frontend-nginx-Configs: `/assets/` → `immutable, 1y`; `index.html` → `no-cache`. Ohne das bleibt nach einem Deploy eine alte `index.html` mit toten Hash-Assets im Browser (weiße Seite). | `frontend/nginx.conf`, `frontend/nginx-frontend.conf` |

### 2.3 Frontend: kleine, harte Bugs

| Status | Maßnahme | Ort |
|---|---|---|
| ✅ | Punkt-Keys `opposition.oncePerMonth` und `endScreen.milestones` in die verschachtelten Objekte einsortieren. `RightPanel.tsx:54` rendert heute in Produktion einen leeren Tooltip. | `public/locales/{de,en}/game.json` |
| ✅ | Toten Autosave-Pfad entfernen: `useAutoSave` schreibt alle 120 s in `bundesrepublik_autosave`, den niemand liest. Reine Quota-Last. | `ui/hooks/useAutoSave.ts`, `Shell.tsx:43` |
| ✅ | `saveGame` aus `gameTick` herausnehmen: Serialisierung des 158-Feld-States bei jedem Tick (im Fast-Forward 4×/s). Auf Monatswechsel oder Debounce umstellen; `isLocalStorageAvailable()` einmalig cachen. *(Tick = Monat in dieser Engine; umgesetzt als 1-s-Debounce mit Flush bei pagehide/visibilitychange)* | `store/gameStore.ts:324` |
| ✅ | `logger.error`/`logger.warn` an Sentry anbinden und `release: __APP_VERSION__` setzen. Die von `safeSystem` abgefangenen Engine-Crashes verschwinden heute in der Konsole. | `utils/logger.ts:22`, `services/sentry.ts:8` |
| ✅ | `resetAutosaveFailures()` in `resetGame`/`init` aufrufen. Nach 3 Cloud-Fehlern bleibt ein Spieler sonst für die Session ohne Cloud-Save. | `core/autosave.ts:75`, `store/gameStore.ts` |
| ✅ | Balance-Sim-Test `nur_sparen` hat unter Coverage-Instrumentierung 6 s gebraucht und ist am 5-s-Default-Timeout gescheitert (lokal reproduziert). `testTimeout` für die Balance-Suite explizit setzen. | `core/simulation/balanceSim.test.ts` |

**Definition of Done Phase 0:** `Lint`, `Docs` und `Deploy` auf `main` grün; ein Deploy
ist durchgelaufen; Sentry empfängt ein Test-Event aus Produktion; alle sechs
Backend-Bugs haben einen Regressionstest.

---

## 3. Phase 1 — Gates schärfen (2 bis 3 Wochen)

Ziel: Jede Eigenschaft, die wir in Phase 2 und 3 herstellen, bekommt vorher ein Gate,
damit sie nicht wieder verfällt. Ohne Phase 1 sind die Refactorings in Phase 2 nach
drei Monaten wieder verwässert, wie es beim Balance-Test bereits passiert ist.

### 3.1 CI

| Status | Maßnahme | Begründung |
|---|---|---|
| ✅ | `npm run build` (`tsc -b && vite build`) als PR-Gate in `lint.yml`. | Läuft heute nur in `deploy.yml`, also erst nach dem Merge. Ein Typfehler, den ESLint nicht sieht, bricht direkt den Deploy-Pfad. |
| ✅ | `npm run test` → `npm run test:coverage` in `lint.yml`. | Die Schwellen in `vite.config.ts` sind vollständig konfiguriert und begründet, laufen aber nie. |
| ✅ | Vitest in zwei Projekte teilen: `unit` (PR-Gate, < 60 s) und `balance` (nur `balance-check.yml`). *(umgesetzt über `--exclude` in den npm-Skripten und `npm run test:balance`)* | Die Balance-Sim macht 280 von 288 s der Suite aus und läuft heute doppelt. |
| ✅ | `pytest-cov` mit `--cov-fail-under=70` im `backend-pytest-db`-Job; den DB-losen `backend-tests`-Job streichen. *(Schwelle 55 %, Ist 61 % inkl. Branch-Coverage)* | Backend-Coverage wird nicht gemessen; der DB-lose Job überspringt 27 % still und ist redundant. |
| ⬜ | `madge --circular` als Gate (nach Fix 4.1 mit Erwartung 0). | 14 Zyklen heute; ohne Gate kommen sie zurück. |
| ⬜ | `knip` (oder `ts-prune`) als Gate für tote Exporte. | 91 tote Exporte, darunter Balancing-Konstanten, die als „aktive Stellschraube“ gelesen werden. |
| ⬜ | i18n-Paritäts-Check de↔en (Key-Set-Diff, Punkt-Keys verboten) als Python- oder Node-Skript. | Parität ist heute zufällig intakt. |
| ⬜ | Guard-Test: `addLog()` darf nur `game:`-Keys erhalten (Grep-Test oder ESLint-Regel). | Voraussetzung für 4.4. |
| ⬜ | Third-Party-Actions auf Commit-SHA pinnen, `gitleaks:latest` auf Release-Tag. Priorität: `appleboy/ssh-action` in `deploy.yml` (hat `DEPLOY_SSH_KEY`). | Issue #262, TODOs stehen im Code. |
| ⬜ | `npm audit --audit-level=high` statt `critical`. | HIGH passiert heute ungehindert. |
| ⬜ | Docker-Images per Digest pinnen; Dependabot-`docker` auch für `docker-compose.prod.yml` (`nginx:alpine`, `certbot/certbot` ohne Tag, `postgres:16-alpine`). | Commit-basierter Rollback in `deploy.sh` ist sonst nicht reproduzierbar. |

### 3.2 Balance-Gate (Game-Design)

Der Balance-Report vom 26. Juli zeigt in 80 von 92 Zellen 100 % Gewinnrate.
`nur_sparen` und `nur_ausgaben` gewinnen gleich gut, „Urteil“ ist in 90 Zellen konstant 50,
die Komplexitätsstufe verändert die Gewinnrate praktisch nicht. Genau dieser Zustand war
im Verbesserungsplan (Juni) als behoben markiert. Ursache: die Assertions prüfen absolute
Untergrenzen (`>= 0.20`), die trivial erfüllt sind. Issue #267 beschreibt dasselbe.

| Status | Maßnahme |
|---|---|
| ⬜ | Diskriminierende Assertions: `winrate(musterschueler) − winrate(random) > 0.25`; `winrate(Stufe 4) < winrate(Stufe 1) − 0.15`; `spread(Urteil über Strategien) > 10`; `nur_sparen` und `nur_ausgaben` dürfen nicht beide > 90 % liegen. |
| ⬜ | Balance-Simulation auf `core/rng` statt `Math.random()` umstellen (7 Stellen in `strategien.ts`, 3 in `state.ts`). Ohne Seed sind Reports nicht diffbar. |
| ⬜ | Eingecheckten `balance-report.md` entweder entfernen (Artefakt reicht) oder in CI mit festem N regenerieren und per `git diff --exit-code` erzwingen, analog zum `api-types-drift`-Job. |

### 3.3 Lokale Gates und Dependency-Hygiene

| Status | Maßnahme |
|---|---|
| ⬜ | `.editorconfig`, Prettier (TS/CSS/JSON/MD), `pre-commit` mit `ruff`, `ruff-format`, `prettier`, `eslint --fix`, `alembic heads`-Check. TypeScript hat heute keinen Formatter, Python hat eines mit CI-Gate. |
| ⬜ | `Makefile`/`justfile` mit `check`, das exakt die CI-Schritte spiegelt. |
| ⬜ | Python-Dependencies auf `uv` (oder `pip-tools`) mit Lockfile und Hashes; `requirements-test.txt` im Root auflösen. Heute installieren zwei CI-Jobs zwei verschiedene Dependency-Sets für dieselbe Codebasis, und Ruff/Mypy sind mit `>=` ungepinnt. Erst nach 2.1 (Python-Version). |
| ⬜ | Test-Fixtures im Backend: `db`-Session mit Rollback-Teardown, `authenticated_client`, `autouse`-Reset für `rate_limit` und `limiter`. Tests sind heute reihenfolgeabhängig (Kommentar in `test_saves_api.py:176-179`). |

**Definition of Done Phase 1:** Ein PR mit Typfehler, Coverage-Regression, neuem
Import-Zyklus, totem Export, fehlendem EN-Key oder Balance-Regression wird rot.
`npm run test` läuft unter 60 s.

---

## 4. Phase 2 — Struktur (4 bis 8 Wochen, in kleinen PRs)

Ziel: die strukturellen Risiken abbauen, die Phase 1 jetzt absichert. Jeder Punkt ist
ein eigener PR; keine Big-Bang-Rewrites.

### 4.1 Content: eine Quelle der Wahrheit (höchste Priorität dieser Phase, Issue #244)

Heute gibt es vier Content-Quellen: DB-Seeds in Migrationen (zur Laufzeit autoritativ),
YAML unter `backend/app/content/` (nur Legacy-Endpunkte, aber das ist, was die CI
validiert), `frontend/src/data/defaults/` (~1 100 Zeilen, direkt in Engine und
contentStore eingebunden, nirgends validiert) und die Content-Blöcke in
`public/locales/*/game.json` (Render-Fallback, bereits gedriftet: 29 statt 33 Events).
Nachgewiesener Drift: `initials: ??` in YAML vs. `"AH"` in der DB.

| Status | Maßnahme |
|---|---|
| ⬜ | Entscheidung dokumentieren (ADR): **DB ist SSOT**, YAML wird zum Seed-Input. |
| ⬜ | Seed-Literale aus den Migrationen (8 Dateien > 500 Zeilen, ~9 000 Zeilen) in versionierte YAML/JSON-Datendateien auslagern; eine generische, idempotente Upsert-Migration bzw. ein `seed`-Kommando lädt sie. Content-Diffs werden damit reviewbar. |
| ⬜ | Legacy-Endpunkte `/content/characters`, `/content/scenarios`, `/content/bundle` entfernen; `services/content.ts` im Frontend ist bereits tot. |
| ⬜ | `frontend/src/data/defaults/*` in die DB seeden und über die Content-API laden (Verbesserungsplan P3, offen seit Juni). |
| ⬜ | `validate_content.py` gegen die migrierte DB laufen lassen (im `backend-pytest-db`-Job, Postgres ist da), Feldabgleich statt ID-Grep; `check_frontend_content_drift.py` entsprechend erweitern. |
| ⬜ | Content-Blöcke aus `game.json` entfernen, sobald der API-Pfad den Fallback nicht mehr braucht; `_deprecated`-Marker auch in `de/game.json`. |
| ⬜ | Alembic-`file_template` mit Zeitstempel statt Nummernpräfix (10 doppelte Präfixe, 9 Merge-Migrationen). |

### 4.2 Frontend-Architektur

| Status | Maßnahme | Aufwand |
|---|---|---|
| ⬜ | **Import-Zyklen**: 20 Module importieren `addLog` aus `../engine` statt `core/log`. Importe umbiegen, Re-Export in `engine.ts:65` entfernen. Löst alle 14 Zyklen. | S |
| ⬜ | **Re-Render-Sturm**: 24 selektorlose `useGameStore()` und `useGameActions` (13 Konsumenten, neues Objekt pro Render) auf atomare Selektoren/`useShallow` umstellen; `React.memo` auf die 13 Chart-Komponenten; `visibleGesetze`/`clusters` in `GesetzAgendaView` memoisieren (die vier nachgelagerten `useMemo` sind heute wirkungslos). Vorbild: `Shell.tsx:44-54`. | M |
| ⬜ | **Store-Nebeneffekte**: 12 `toast()`-Aufrufe innerhalb von `set(prev => …)`. Auf das `{ state, effect }`-Muster aus `core/commands/einbringen.ts` umstellen. Behebt das StrictMode-Doppel-Toast-Risiko und macht die Aktionen testbar. | M |
| ⬜ | `gameStore` (51 Aktionen) in Domänen-Slices schneiden (`gesetz`, `bundesrat`, `medien`, `wahlkampf`, `persistence`). | M |
| ⬜ | **Save-Schema-Versionierung**: `SAVE_VERSION` von `package.json` entkoppeln (`SAVE_SCHEMA_VERSION: number`), nummerierte Migrationskette statt 100 Zeilen ungeordneter `if (!result.x)`-Blöcke in `migrateGameState`, eingefrorene Beispiel-Saves als Regressionstests. Heute invalidiert ein Release `0.6.0` jeden lokalen Spielstand. Ladefehler dem Spieler melden statt nur `logger.warn`. | M |
| ⬜ | `MediaState`-Migration (Issue #223, Phase 2) abschließen: 10 `@deprecated`-Felder und `syncMediaState()` entfernen. | M |
| ⬜ | `core/autosave.ts` aus `core/` nach `services/` verschieben (einziger Reinheitsbruch: importiert Store und Services). `core/systems/events/*` importiert `i18n` (Browser-Singleton) — Keys zurückgeben statt übersetzen. | S |
| ⬜ | `core/` vs. `core/systems/` Regel festlegen und durchziehen (Issue #235, Teil-PRs #415/#417 offen). `core/` = Primitive, Fachliches in `core/systems/<domäne>/`. | M |
| ⬜ | God-Module splitten: `state.ts` (create/validate/migrate), `events.ts` (`resolveEvent` 267 Zeilen), `wahlkampf.ts` (Bilanz/Aktionen/Wahlnacht), `bundesrat.ts` (Voting/Aktionen), `WahlnachtOnboarding.tsx` (11 Beats → Komponenten + Datenarray). | L |
| ⬜ | Toten Code löschen: `services/mods.ts`, `services/analytics.ts`, `services/content.ts`, `AgendaView`, `KPITile`, `EuropeMapChart`, ~15 Balancing-Konstanten, `berechne*Qualitativ`. `ErrorBoundary.tsx` **behalten** und pro Route/Panel einsetzen (heute nur eine Boundary ganz außen). | S |
| ⬜ | Startseite entschlacken: GeoJSON mit `mapshaper -simplify` auf < 150 kB, `StartMapView` + echarts lazy laden (Issue #261, PR #416 offen). | S |
| ⬜ | `procgen.ts:18-21`: `.toFixed(1) as unknown as number` → `Number(x.toFixed(1))`; `eu.ts`: 9× `s.eu!` durch einen Guard am Funktionseingang ersetzen. | S |

### 4.3 Frontend: i18n und Barrierefreiheit

| Status | Maßnahme |
|---|---|
| ⬜ | Zuerst `BundestagView.tsx:59` reparieren: filtert Spiellogik über deutsche Substrings (`'beschlossen'`, `'verfehlt'`). `LogEntry` bekommt ein `category`-Feld. Blocker für den nächsten Punkt. |
| ⬜ | 118 `addLog`-Aufrufe und 12 Store-Toasts auf `game:`-Keys mit Params umstellen; Balancing-Zahlen aus `core/constants.ts` interpolieren statt in Strings schreiben. Englische Spieler sehen im Ereignisprotokoll heute überwiegend Deutsch. `core/log.ts:9` (`Monat X`) als Zahl speichern. |
| ⬜ | 13 Dialoge (`ConfirmDialog`, `GegenfinanzierungsModal`, `FramingModal`, `LoginModal`, `LobbyingOverlay`, `Glossar`, …) auf die vorhandene `<Modal>`-Komponente mit `useModalA11y` umstellen (Focus-Trap, ESC, `role="dialog"`). Fertig gebaut und getestet, wird nur von 2 Stellen genutzt. Pro Dialog ~5 Zeilen. |
| ⬜ | `parseMissingKeyHandler` in Produktion: `logger.warn` statt stillem `''`. 158 deutsche Inline-Fallbacks als 2. `t()`-Argument entfernen, sobald der Paritäts-Check (3.1) steht. |
| ⬜ | 404-Catch-All-Route, `Kontakt.tsx` übersetzen (Backlog-Punkte). |

### 4.4 Backend-Struktur

| Status | Maßnahme |
|---|---|
| ⬜ | 12 wortgleich duplizierte Helper zwischen `spielende_service.py` und `agenda_eval_service.py` in ein gemeinsames `game_state_query.py` ziehen; `_monate_koalitionsbeziehung_unter` ist bereits divergiert. `evaluate_*` aus den `_*_ampel`-Funktionen ableiten statt zweimal pflegen. |
| ⬜ | `content_db_service.py` (1 253 Zeilen) nach Domänen splitten; `get_game_content_from_db` (185 Zeilen, drei hartcodierte Event-ID-Mengen) durch `WHERE event_type = …` ersetzen. N+1 in `fetch_verbaende`/`fetch_eu_events` auf Batch-`IN` umstellen (wie `fetch_events` bereits). |
| ⬜ | bcrypt in `asyncio.to_thread`; Refresh-Tokens auf HMAC-SHA256 statt bcrypt (32 Byte Entropie brauchen keinen KDF); Dummy-Verify bei unbekanntem User (Timing-Enumeration); Mailversand in `BackgroundTasks` (Magic-Link hält heute bis 6 s eine DB-Session). |
| ⬜ | Fat Routes (`kontakt.py` mit zweitem SMTP-Code, `mods.py`, `usertest_feedback.py`, `admin_*.py` mit 870 Zeilen ORM in Handlern) auf Services; Admin-Serialisierung per `response_model` statt 3× handgeschriebener Dicts. |
| ⬜ | `ondelete="CASCADE"` auf allen i18n-/Child-FKs, Indizes auf FK-Spalten (`event_choices.event_id`, `bundesrat_tradeoffs.fraktion_id`, …). |
| ⬜ | `mypy --strict` in drei Schritten: Rückgabetypen an Route-Handlern (fällt mit `response_model` zusammen), `dict` → `dict[str, Any]`, generischer Cache-Helper. Danach `strict = true` per Modul-Override, beginnend mit `auth_service` und `models`. Ruff-Regel `ANN` aktivieren. |
| ⬜ | `TypedDict`/Pydantic für `game_state` und `client_meta` (heute `dict` mit `.get()`-Defensivcode in allen Auswerte-Services). |
| ⬜ | `/api/ready` mit `SELECT 1` ergänzen und Healthchecks darauf umstellen; `/api/health` bleibt Liveness. Version aus `app.version` statt Literal. |
| ⬜ | Request-ID-Middleware (`X-Request-ID` → ContextVar → Log-Filter → Sentry-Tag); Zugriffs-Log mit `extra=`-Feldern statt `%s`-String. |
| ⬜ | Engine nicht auf Modulebene bauen (`database.py:10-17`), Settings per `Depends`. Erlaubt Tests ohne `os.environ`-Hack in `conftest.py`. |

### 4.5 Tests

| Status | Maßnahme |
|---|---|
| ⬜ | Tabellengetriebener Store-Test: jede der 51 `do*`-Aktionen mit gültigem State → kein Throw, State-Identität ändert sich. Ein Test, 51 Fälle. |
| ⬜ | UI-Tests nach Schadenspotenzial: `SaveSlots` (irreversibles Löschen), `LoginModal`, `GameSetup`, `MonatszusammenfassungModal`. |
| ⬜ | `authStore`: 401→Refresh→Retry und parallele 401s (nur ein Refresh). |
| ⬜ | Golden-Test für `core/rng.ts` (fester Seed → fixe Sequenz). |
| ⬜ | Backend: `/api/content/bundle`, `/content/gesetz-relationen`, Admin-Schreibrouten für Gesetze/Events/Bundesrat, `mod_validator` (wirft heute 500 statt 422 bei falschem Typ). |
| ⬜ | Tick-Order-Test gegen `ENGINE_PIPELINE` (Verbesserungsplan P4, offen). |
| ⬜ | Coverage-Schwellen nach jedem Block anheben: `store` 15 → 50, `ui` 8 → 30, Backend 70 → 80. |

**Definition of Done Phase 2:** Content hat eine Quelle mit CI-Abgleich; 0 Zyklen;
`madge`, `knip`, Coverage und Paritäts-Gates grün bei angehobenen Schwellen; alle Dialoge
tastaturbedienbar; EN-Spieler sehen kein deutsches Protokoll; `mypy --strict` für
`auth_service`, `models`, `schemas`.

---

## 5. Phase 3 — Betrieb, Prozess, Dokumentation (parallel zu Phase 2)

### 5.1 Betrieb

| Status | Maßnahme |
|---|---|
| ⬜ | `docker-compose.prod.yml`: `logging` mit `max-size: 10m, max-file: 3` je Service (heute wächst das Access-Log unbegrenzt), `deploy.resources.limits`, `security_opt: no-new-privileges`, `pids_limit`. |
| ⬜ | nginx: `server_tokens off`, `http2 on;` statt deprecated `listen … http2`, gzip auch für `/api/` (das Content-Bundle geht heute unkomprimiert raus). gzip-Block nicht mehr in zwei Frontend-Configs duplizieren. |
| ⬜ | `deploy.sh`: vor `up -d` ein `backup-db.sh` erzwingen; Advisory-Lock in `env.py` für parallele `alembic upgrade`. Der heutige Rollback rollt nur Code zurück, nie das Schema. |
| ⬜ | Backups mit `age`/GPG verschlüsseln (Dumps enthalten E-Mails und Passwort-Hashes und liegen unverschlüsselt offsite); `verify-restore.sh` per Cron statt „quartalsweise manuell“; Alarm bei Backup-Fehler. |
| ⬜ | `docs/deployment.md:17` korrigieren: mit einer Replik gibt es keine Zero-Downtime-Updates. |
| ⬜ | Inaktive Magic-Link-Accounts nach X Tagen purgen; Limit pro E-Mail-Adresse (heute nur IP). |

### 5.2 Prozess und Release

| Status | Maßnahme |
|---|---|
| ⬜ | SemVer-Tags bei jedem Deploy, `CHANGELOG.md` generiert aus Conventional Commits (Konvention existiert bereits). Versionsnummer aus einer Quelle (`package.json` 0.5.0, `pyproject` 0.1.0, `health` liefert `"0.1.0"` hart). |
| ⬜ | LICENSE festlegen (Issue #265). Ohne Lizenz verlangt `CONTRIBUTING.md` Zustimmung zu etwas, das niemand kennt. |
| ⬜ | `SECURITY.md`, `CODEOWNERS`, `docs/adr/` mit den drei bereits getroffenen Entscheidungen (DB als SSOT, fiktive Parteien, Komplexitätsstufen statt Schwierigkeitsgrad). |
| ⬜ | WIP-Limit für parallele KI-generierte Feature-PRs (max. 3), Refactoring-PRs immer zuerst mergen. Zehn gleichzeitige PRs, von denen mehrere `core/systems/` umbauen, sind ein Konfliktgenerator. |
| ⬜ | Entscheidung zur Playtest-Sperre: `gesperrte_stufen: [2, 3]` blockiert die Hälfte der dokumentierten Spielerfahrung inkl. Bundesrat-Lobbying. Entweder freigeben oder prominent in README/Doku als Playtest-Zustand kennzeichnen. |

### 5.3 Dokumentation (Drift beseitigen)

| Status | Maßnahme |
|---|---|
| ✅ | `docs/ci-cd.md` und `deployment.md:127` an die reale Pipeline anpassen: `deploy.yml` ist `workflow_run`-getriggert, führt **keine** Tests aus, nutzt `deploy.sh` mit Rollback; sechs Jobs (secret-scan, container-scan, api-types-drift, backend-pytest-db, Content-Validierung, Drift-Check) fehlen komplett. *(`ci-cd.md` neu geschrieben; `deployment.md:127` noch offen)* |
| ⬜ | `CLAUDE.md`, `AGENTS.md`, `projektstruktur.md`, `architektur.md`: `stores/` existiert nicht (nur `store/`), `core/types.ts` existiert nicht (nur `core/types/`), `phaser/` existiert nicht, kein `scenarios`-Workflow, Balance-Sim hat N=200, nicht 500. *(CLAUDE.md/AGENTS.md korrigiert; projektstruktur.md/architektur.md offen)* |
| ⬜ | `frontend/README.md` ist unverändertes Vite-Boilerplate. Ersetzen oder löschen. |
| ⬜ | GDD/Spielsysteme: 8 Events als „geplant“ markiert, die längst existieren; Event- und Gesetzeszahlen veraltet (29 → 33, 4 → ~55); 13 implementierte Systeme in keinem Design-Dokument; reale Parteinamen im GDD, fiktive im Code; `designfragen.md` ist eine driftende Kopie von GDD §8. Abschnitt „Systeme im Code“ aus `ENGINE_PIPELINE` generieren. |
| ⬜ | Backlog-Dateien bereinigen: `CHANGELOG-BACKLOG.md` (zwei erledigte Punkte, veraltete Pfade, die „bekannten Failures“ sind grün), `plan.md` im Root (CSS-Plan, 5 von 7 Stichproben erledigt, nicht in mkdocs) nach `docs/entwicklung/` mit Statusspalte, `security-review.md` (April, kennt Mods-API und Admin-Rate-Limit nicht). `docs/index.md` datiert auf „März 2026“. |

---

## 6. Was ich bewusst nicht empfehle

- **Kein Big-Bang-Rewrite von `gameStore` oder `content_db_service`.** Beide sind lang,
  aber intern konsistent. Slices und Domänen-Splits als Serie kleiner PRs, jeweils mit
  dem Guard-Test aus 4.5 davor.
- **Kein Coverage-Ziel über 80 %.** Die UI-Schicht ist mit Testing-Library teuer zu
  testen; wichtiger ist, dass die 51 Store-Aktionen und die vier riskanten Dialoge
  abgedeckt sind. Schwellen schrittweise anheben, nicht auf einen Zielwert springen.
- **Nicht zuerst auf `uv` migrieren.** Erst die Python-Version festzurren (Phase 0),
  sonst wird ein Lockfile für die falsche Runtime gebaut.
- **Den CSS-Polierungsplan (`plan.md`) nicht priorisieren.** Fünf von sieben Stichproben
  sind bereits umgesetzt, der Rest ist kosmetisch. In die Doku verschieben, Status pflegen,
  fertig.
- **Dependabot-Majors nicht im Block mergen.** Die Kommentare in `dependabot.yml` erklären,
  warum das zuletzt zehn Testdateien gebrochen hat. Einzeln, mit Build-Gate (3.1).
- **Prozess-Cache nicht durch Redis ersetzen.** Für zwei Uvicorn-Worker reicht ein
  `TTLCache` mit `maxsize`; die Invalidierungsfrage (#249/#231) ist mit dem
  `contentVersion`-Hash im Frontend bereits abgefangen.

---

## 7. Zuordnung zu offenen Issues

| Issue | Abschnitt hier |
|---|---|
| #235 core/systems gliedern | 4.2 |
| #244 Content-Sync / Drift | 4.1 |
| #261 GeoJSON verkleinern | 4.2 (PR #416 offen) |
| #262 Actions pinnen | 3.1 |
| #265 LICENSE / Repo-Hygiene | 5.2 |
| #267 Stufe 1 unverlierbar | 3.2 |
| #343 pytest mit Postgres | 3.1 (Job streichen), 3.3 (Fixtures) |
| #223 MediaState-Migration | 4.2 |
| #249 / #231 Cache-Invalidierung | 6 (bewusst nicht) |

---

## 8. Reihenfolge, wenn nur eine Woche Zeit ist

1. PR #423 mergen, Docs-Pages aktivieren, Python auf 3.13 → `main` grün, Deploy läuft.
2. Sentry-Variablen und Cache-Header in Prod-Compose/nginx.
3. Die sechs Backend-Bugs aus 2.2 mit Tests.
4. `npm run build` + `test:coverage` als PR-Gate, Balance-Sim aus der Unit-Suite.
5. `addLog`-Importe umbiegen, `madge` als Gate.
6. Balance-Assertions diskriminierend machen.
7. `useAutoSave` löschen, `saveGame` aus dem Tick, `logger` → Sentry.
