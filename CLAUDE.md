# CLAUDE.md — Project Guide for AI Assistants

## Project Overview

**politikpraxis** is a browser-based political simulation game called **Bundesrepublik**. The player leads a German federal government through a 4-year legislative term, passing laws through a multi-stage political system while managing cabinet, coalition partners, Bundesrat, EU level, and municipalities — with the goal of re-election.

Full-stack app: React/TypeScript frontend + FastAPI/Python backend + PostgreSQL database.

## Quick Commands

### Frontend (run from `frontend/`)

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage
```

### Backend (run from `backend/`)

```bash
pip install -r requirements.txt
alembic upgrade head                              # Apply DB migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # Dev server
python -m pytest --tb=short                       # Run tests
ruff check app tests                              # Lint
ruff format app tests                             # Format
mypy app                                          # Type check
```

### Docker

```bash
docker-compose up --build                         # Production stack
docker compose -f docker-compose.dev.yml up --build  # Dev with HMR
docker compose down                               # Stop
```

### Documentation (run from root)

```bash
pip install -r docs/requirements.txt
mkdocs serve          # Local docs at http://127.0.0.1:8000
mkdocs build          # Static build to site/
```

## Project Structure

```
/
├── frontend/                    # React/TypeScript SPA (Vite)
│   └── src/
│       ├── core/                # Game logic engine (pure TS, heavily tested)
│       │   ├── engine.ts        # Main game tick engine
│       │   ├── state.ts         # Core game state
│       │   ├── types.ts         # All game types (GameState, Law, Character, etc.)
│       │   └── systems/         # Game subsystems (called by engine.tick)
│       ├── store/               # Zustand stores (gameStore, uiStore, authStore)
│       ├── stores/              # Additional stores (contentStore)
│       ├── services/            # API client (api.ts), auth, content, saves
│       ├── ui/                  # React components
│       │   ├── screens/         # Full-page screens
│       │   ├── components/      # Reusable UI components
│       │   ├── views/           # View components
│       │   ├── panels/          # Sidebar/panel components
│       │   ├── layout/          # Layout wrappers
│       │   ├── hooks/           # Custom React hooks
│       │   └── lib/             # UI utilities
│       ├── data/                # Game scenarios, laws, events, characters
│       ├── constants/           # Static constants
│       ├── types/               # Content type definitions
│       ├── config/              # App configuration
│       ├── styles/              # global.css, tokens.css (CSS variables)
│       └── i18n.ts              # i18next config (de/en, fallback: de)
├── backend/                     # FastAPI backend
│   └── app/
│       ├── main.py              # App init, router mounting
│       ├── config.py            # Pydantic Settings (env vars)
│       ├── dependencies.py      # FastAPI dependency injection
│       ├── limiter.py           # Rate limiting (slowapi)
│       ├── routes/              # API endpoints (auth, saves, content, admin, analytics, mods)
│       ├── models/              # SQLAlchemy ORM models
│       ├── schemas/             # Pydantic request/response schemas
│       ├── services/            # Business logic layer
│       ├── db/                  # Database setup + Alembic migrations
│       └── content/             # Game content loading
├── docs/                        # MkDocs documentation (German)
│   ├── game-design/             # Concept, core loop, systems, roadmap
│   └── entwicklung/             # Setup, architecture, project structure
├── nginx/                       # Production nginx config (TLS, CSP headers)
├── .github/workflows/           # CI/CD (lint, deploy, balance-check, scenarios)
├── bundesrepublik_gdd.md        # Game Design Document (single source of truth)
├── AGENTS.md                    # AI agent instructions (German)
└── docker-compose*.yml          # Docker orchestration (dev/prod)
```

## Architecture & Patterns

### Frontend

- **State management**: Zustand stores — never Redux. Game state changes only through `gameStore` actions (`gameTick`, `doEinbringen`, `doLobbying`, etc.)
- **Tick system**: `engine.tick(state, content)` in `core/engine.ts` calls subsystems in `core/systems/` sequentially
- **Data fetching**: TanStack React Query for server state
- **API client**: Generic `apiFetch<T>()` in `services/api.ts` wrapping fetch with auth headers. Base URL from `VITE_API_URL`
- **Styling**: CSS Modules (`.module.css` per component)
- **i18n**: i18next with HTTP backend, namespaces `common` and `game`, fallback language `de`
- **Routing**: React Router v7
- **Charts**: ECharts (separate vendor chunk in Vite config)
- **File naming**: Components in PascalCase (`KPITile.tsx`), stores in camelCase with Store suffix, tests with `.test.ts`

### Backend

- **Framework**: FastAPI (async), app in `app/main.py`
- **ORM**: SQLAlchemy 2 with async sessions (`asyncpg`), `Mapped` column style
- **Migrations**: Alembic (run `alembic upgrade head` before starting)
- **Validation**: Pydantic v2 schemas for all request/response models
- **Auth**: JWT bearer tokens (short-lived) + HttpOnly refresh cookies + magic link email login
- **Admin**: HTTP Basic Auth (separate from user auth)
- **Rate limiting**: slowapi decorators on routes
- **DB sessions**: `AsyncSession` via `Depends(get_db)` with auto commit/rollback
- **Content localization**: i18n suffix tables (e.g., `Char` + `CharI18n`), validated with `validate_locale()` dependency

### Database

- PostgreSQL 16 with async driver (asyncpg)
- Models in `backend/app/models/` (User, Save, Char, Gesetz, Event, Bundesrat, etc.)
- Each content model has an i18n counterpart table

## CI/CD Pipelines

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `lint.yml` | Push to main, PRs | Ruff check/format + MyPy (backend), ESLint (frontend) |
| `deploy.yml` | Push to main | pytest + npm build, then SSH deploy to server |
| `balance-check.yml` | Changes to content/core | Monte Carlo simulation (500 iterations) |
| `scenarios.yml` | Push to main, PRs | Scenario integration tests |

## Environment Variables

### Backend (`backend/.env`, see `.env.example`)
- `DATABASE_URL` — PostgreSQL asyncpg connection string
- `SECRET_KEY` — JWT secret
- `CORS_ORIGINS` — JSON array of allowed origins
- `ADMIN_USER` / `ADMIN_PASSWORD` — Admin API basic auth
- `SMTP_*` — Email configuration for magic links
- `DEBUG` — Enable debug mode
- `CONTENT_DIR` — Game content directory

### Frontend (`frontend/.env`, see `.env.example`)
- `VITE_API_URL` — Backend API base URL (e.g., `http://localhost:8000/api`)

## Code Conventions

- **Language**: Code comments and commit messages may be in German or English — stay consistent within a file/commit
- **Commit style**: `feat:`, `fix:`, or descriptive messages; optional scope like `(SMA-XXX):`
- **Game design reference**: Always check `bundesrepublik_gdd.md` and `docs/game-design/` before implementing new features
- **State changes**: Only through gameStore actions — no direct mutations
- **API sync**: Keep backend routes and frontend services in sync when changing API contracts
- **Documentation**: Update `docs/` for significant changes
- **Testing**: Frontend game logic in `core/` should have unit tests (Vitest). Backend uses pytest with async fixtures and `AsyncClient`
- **Python style**: Ruff formatting (line length 88), type hints required, MyPy checked
- **TypeScript style**: Strict mode, no unused locals/parameters, ESLint flat config
- **Unused variables**: Prefix with `_` to suppress lint warnings (both Python and TypeScript)

## Key Reference Files

| File | Purpose |
|------|---------|
| `bundesrepublik_gdd.md` | Game Design Document — single source of truth for game mechanics |
| `docs/game-design/` | Detailed game design docs (concept, core loop, systems, roadmap) |
| `docs/entwicklung/architektur.md` | Architecture documentation |
| `docs/entwicklung/setup.md` | Development environment setup |
| `frontend/src/core/types.ts` | All game type definitions |
| `frontend/src/core/engine.ts` | Game tick engine |
| `backend/app/config.py` | Backend configuration (all env vars) |
| `backend/app/main.py` | FastAPI app initialization and router setup |

## API Overview

- `GET /api/health` — Health check
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` — Auth
- `GET/POST/PUT/DELETE /api/saves/{id}` — Game saves (JWT)
- `GET /api/content/game?locale=de` — Full game content bundle
- `GET /api/content/{chars,gesetze,events,bundesrat,milieus,politikfelder,verbaende}` — Individual content
- `POST /api/analytics/batch` — Analytics events
- `GET /api/admin/*` — Admin CRUD (Basic Auth)
- Swagger UI: `/api/docs`
