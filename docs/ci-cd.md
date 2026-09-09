# CI/CD & Release Engineering

Diese Seite beschreibt, was in der CI läuft, wann es läuft, und wie du die Checks lokal
reproduzierst. Stand: September 2026 (siehe [Qualitätsplan](entwicklung/qualitaetsplan.md)).

---

## Übersicht der Workflows

Die Workflows liegen unter `.github/workflows/`:

| Workflow | Trigger | Inhalt |
|---|---|---|
| `lint.yml` | Push auf `main`, PRs | Lint/Format/Typecheck, Tests mit Coverage, Content-Validierung, Security-Scans, API-Typ-Drift, Migrationen gegen Postgres |
| `deploy.yml` | `workflow_run` nach **erfolgreichem** `lint.yml` auf `main` | Frontend-Build, dann SSH-Deploy über `scripts/deploy.sh` (Health-Gate + Rollback) |
| `balance-check.yml` | Änderungen an `frontend/src/core/**`, `backend/app/content/**`, `frontend/scripts/**` | Balance-Simulation (Monte-Carlo über die echte Engine) + Report-Artefakt |
| `docs.yml` | Push auf `main`, PRs | `mkdocs build --strict`; Deploy nach GitHub Pages bei Push |

Ein roter `lint.yml`-Lauf auf `main` bedeutet: **kein Deploy**. `deploy.yml` startet nur
nach `conclusion == success`.

---

## `lint.yml` (Qualität + Security)

Alle Jobs laufen parallel und blockieren PRs.

### `backend-ruff`
- **Ruff**: `ruff check app tests`, `ruff format --check app tests`
- **MyPy**: `mypy app`
- **Content-Validierung**: `python scripts/validate_content.py` (YAML-interne Kreuzvalidierung)
- **Frontend-Content-Drift**: `python scripts/check_frontend_content_drift.py` (IDs aus `testContent.ts` gegen Seeds/YAML)
- **pip-audit** gegen `backend/requirements.txt`
- **Bandit** (`-ll`, blockiert ab HIGH)

### `backend-pytest-db`
- Postgres 16 als Service-Container
- **Genau ein Alembic-Head** (`alembic heads`), sonst Abbruch
- **`alembic upgrade head` gegen eine leere DB** — die komplette Migrationshistorie muss durchlaufen
- **pytest** inkl. aller `@requires_db`-Tests, mit **Coverage-Schwelle** (`--cov-fail-under`, aktuell 55 %; Ist-Stand ~61 % inkl. Branch-Coverage)

Es gibt keinen DB-losen pytest-Job mehr: der übersprang 27 % der Tests still und war
gegenüber diesem Job redundant.

### `frontend-eslint`
- **ESLint**: `npm run lint`
- **Build**: `npm run build` (`tsc -b` + `vite build`) — als PR-Gate, nicht erst nach dem Merge
- **Unit-Tests mit Coverage-Schwellen**: `npm run test:coverage` (Schwellen je Verzeichnis in `frontend/vite.config.ts`)
- **npm audit**: `npm audit --audit-level=critical`

Die Balance-Simulation ist **nicht** Teil der Unit-Suite (siehe `balance-check.yml`).

### `secret-scan`
- gitleaks über das gesamte Repo (`--no-git`, redacted)

### `container-scan`
- Baut Backend- und Frontend-Image und scannt sie mit Trivy (CRITICAL/HIGH, `ignore-unfixed`)

### `api-types-drift`
- Exportiert das OpenAPI-Schema des Backends und prüft, dass `backend/openapi.json` und
  `frontend/src/types/api-generated.ts` unverändert sind (`npm run check:api-types`)

### Lokal reproduzieren

```bash
# Backend
cd backend
pip install -r requirements-dev.txt          # inkl. pytest, pytest-cov
pip install -r ../requirements-test.txt      # ruff, mypy
ruff check app tests && ruff format --check app tests && mypy app
python scripts/validate_content.py
python scripts/check_frontend_content_drift.py
python -m pytest --cov=app                   # DB-Tests laufen nur mit erreichbarem Postgres
pip install pip-audit && pip-audit -r requirements.txt
pip install "bandit[toml]" && bandit -r app -c pyproject.toml -ll

# Frontend
cd frontend
npm ci
npm run lint
npm run build
npm run test:coverage
npm audit --audit-level=critical
npm run check:api-types                      # braucht das Backend-venv im PATH (python3)
```

Für die DB-Tests lokal: Postgres auf `localhost:5432` mit `postgres/postgres` oder
`DATABASE_URL` setzen, dann `alembic upgrade head` und `python -m pytest`.

---

## `balance-check.yml` (Game-Balance-Regression)

Trigger: Änderungen an `frontend/src/core/**`, `backend/app/content/**`, `frontend/scripts/**`
und der Workflow-/Doku-Dateien selbst.

Ausführung:

1. `npm run test:balance` — Vitest-Run von `balanceSim.test.ts` (Assertions zu Gewinnraten,
   Crash-Freiheit, Komplexitätsstufen)
2. `npm run balance:report -- --n=25 --seed=42` — Report als Workflow-Artefakt

Lokal:

```bash
cd frontend
npm run test:balance
npm run balance:report -- --n=200 --seed=42 --out=../docs/entwicklung/balance-report.md
```

---

## `deploy.yml` (Deploy to Production)

Trigger: `workflow_run` — startet nur, wenn `lint.yml` auf `main` erfolgreich war
(gleicher Commit, `head_sha`).

Ablauf:

1. **`build-check`**: `npm ci` + `npm run build` (Frontend)
2. **`deploy`**: SSH auf den Server, dort `scripts/deploy.sh`:
   `git pull`, `docker compose -f docker-compose.prod.yml build`, `up -d`,
   Health-Gate gegen `/api/health`, bei Fehlschlag Rollback per `git reset --hard`
   auf den vorherigen Commit und erneutes `up -d`.

Es laufen **keine** Tests in `deploy.yml` — die Tests sind bereits Bedingung für den
Start (grüner `lint.yml`).

Wichtige Secrets (GitHub): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

Server-Absicherung: Deploy-User ohne sudo, Deploy-Key in `authorized_keys` mit
**forced command**. Details siehe [Deployment (Produktion)](deployment.md).

Bekannte Lücke: Der Rollback in `deploy.sh` setzt nur den **Code** zurück, nicht das
DB-Schema (siehe Qualitätsplan, Phase 3).

---

## `docs.yml` (MkDocs)

`mkdocs build --strict` bei jedem Push/PR; Deploy nach GitHub Pages nur bei Push auf `main`.
Voraussetzung für den Deploy-Job: GitHub Pages ist in den Repo-Settings mit Source
„GitHub Actions“ aktiviert — sonst schlägt `actions/deploy-pages` mit 404 fehl.

---

## „Release“-Praktiken

- **Main ist deploybar**: `lint.yml` muss grün sein, bevor auf `main` gemerged wird.
- **Kleine PRs**: Gerade bei Content-/Balance-Änderungen sind kleinere Schritte leichter zu prüfen.
- **Parallele Feature-PRs begrenzen**: Mehrere gleichzeitige PRs, die dieselben
  `core/systems/`-Module umbauen, erzeugen Konflikte. Refactoring-PRs zuerst mergen.
- **Rollback-Plan**: Im Zweifel vorherigen Commit redeployen; bei DB-Migrationen vorher
  `scripts/backup/backup-db.sh`.
