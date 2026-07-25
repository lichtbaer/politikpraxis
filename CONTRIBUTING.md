# Contributing to politikpraxis

Danke für dein Interesse, an **Bundesrepublik** (politikpraxis) mitzuwirken!

## Bevor du anfängst

- Lies das [Game Design Document](bundesrepublik_gdd.md) und die [Spieldesign-Doku](docs/game-design/) —
  sie sind die Single Source of Truth für Spielmechanik-Entscheidungen.
- Prüfe die [offenen Issues](https://github.com/lichtbaer/politikpraxis/issues), ob dein Anliegen
  schon erfasst ist, bevor du ein neues eröffnest.

## Entwicklungsumgebung einrichten

Setup-Anleitung (Frontend, Backend, Datenbank, Docker) siehe [docs/entwicklung/setup.md](docs/entwicklung/setup.md)
sowie die Kurzbefehle im [README](README.md#entwicklung-kurz).

## Konventionen

Die verbindlichen Konventionen für Branches, Commits, Code-Stil und Tests sind in
[CLAUDE.md](CLAUDE.md) und [AGENTS.md](AGENTS.md) dokumentiert (diese Dateien sind auch die
Referenz, die AI-Coding-Agents in diesem Projekt befolgen). Kurzfassung:

- **Commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:` — optional mit Scope, z. B. `feat(backend):`.
- **Sprache:** Code-Kommentare und Commit-Messages können Deutsch oder Englisch sein — innerhalb
  einer Datei/eines Commits konsistent bleiben.
- **Tests:** Neue Spiellogik in `frontend/src/core/` braucht Vitest-Unit-Tests; Backend-Änderungen
  brauchen pytest-Tests (async Fixtures, `AsyncClient`).
- **Lint/Type-Check vor dem PR:** Frontend `npm run lint && npm run build`; Backend
  `ruff check app tests && ruff format app tests && mypy app`.
- **API-Verträge:** Backend-Routen und Frontend-Services synchron halten; bei Content-Schema-Änderungen
  `npm run gen:api-types` ausführen und die generierten Typen committen.

## Pull Requests

1. Branch von `main` abzweigen (Namensschema z. B. `feat/...`, `fix/...`).
2. Änderungen mit passenden Tests und grünem Lint/Type-Check einreichen.
3. Das [PR-Template](.github/PULL_REQUEST_TEMPLATE.md) ausfüllen und ggf. mit `Closes #NNN` auf das
   zugehörige Issue verweisen.
4. CI (`lint.yml`, `deploy.yml`-Tests) muss grün sein, bevor gemerged wird.

## Issues melden

Für Bugs und Feature-/Balance-Vorschläge stehen [Issue-Templates](.github/ISSUE_TEMPLATE/) bereit.

## Lizenz

Die Lizenz dieses Projekts ist in [README.md](README.md#lizenz--beitragen) vermerkt, sobald sie vom
Maintainer festgelegt wurde (siehe [#265](https://github.com/lichtbaer/politikpraxis/issues/265)).
Mit einem Beitrag stimmst du zu, dass dieser unter der dann geltenden Projektlizenz veröffentlicht wird.
