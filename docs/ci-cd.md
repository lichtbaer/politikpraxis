# CI/CD & Release Engineering

Diese Seite beschreibt, was in der CI läuft, wann es läuft, und wie du die Checks lokal reproduzierst.

---

## Übersicht der Workflows

Die Workflows liegen unter `.github/workflows/`:

- **`lint.yml`**: Lint/Format/Typechecks + Security-Audits (Backend & Frontend)
- **`deploy.yml`**: Tests + Build, danach SSH-Deploy bei Push auf `main`
- **`balance-check.yml`**: Balance-Simulation (Vitest) bei Änderungen an `frontend/src/core/**` oder Content

---

## `lint.yml` (Qualität + Security)

### Backend
- **Ruff**: `ruff check app tests`
- **Ruff format (check)**: `ruff format --check app tests`
- **MyPy**: `mypy app`
- **pip-audit**: Dependency-Security-Scan gegen `backend/requirements.txt`
- **Bandit**: Security-Linter (blockiert bei HIGH/mehr)

Lokal reproduzieren:

```bash
cd backend
pip install -r requirements-test.txt
ruff check app tests
ruff format --check app tests
mypy app
pip install pip-audit && pip-audit -r requirements.txt
pip install "bandit[toml]" && bandit -r app -c pyproject.toml -ll
```

### Frontend
- **ESLint**: `npm run lint`
- **Unit Tests**: `npm run test`
- **npm audit**: `npm audit --audit-level=critical`

Lokal reproduzieren:

```bash
cd frontend
npm ci
npm run lint
npm run test
npm audit --audit-level=critical
```

---

## `balance-check.yml` (Game-Balance Regression)

Trigger: Änderungen an

- `frontend/src/core/**`
- `backend/app/content/**`

Ausführung: Vitest-Run der Balance-Simulation.

Lokal reproduzieren:

```bash
cd frontend
npm ci
npx vitest run src/core/simulation/balanceSim.test.ts --reporter=verbose
```

---

## `deploy.yml` (Deploy to Production)

Trigger: Push auf `main`.

Ablauf:

1. **Backend Tests**: `pytest`
2. **Frontend Tests**: `npm run test`
3. **Frontend Build**: `npm run build`
4. **Deploy via SSH**: Pull + `docker compose -f docker-compose.prod.yml build` + `up -d`

Wichtige Secrets (GitHub):

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

Server-Absicherung (Empfehlung): Deploy-User ohne sudo, Deploy-Key in `authorized_keys` mit **forced command**. Details siehe [Deployment (Produktion)](deployment.md).

---

## „Release“-Praktiken (empfohlen)

- **Main ist deploybar**: CI muss grün sein, bevor auf `main` gemerged wird.
- **Kleine PRs**: Gerade bei Content-/Balance-Änderungen sind kleinere Schritte leichter zu prüfen.
- **Rollback-Plan**: Im Zweifel: vorheriges Image/Commit redeployen (insb. bei DB-Migrationen).

