# politikpraxis

**politikpraxis** ist das Projekt hinter der browserbasierten Politiksimulation **Bundesrepublik**. Du führst eine Bundesregierung durch eine 4-jährige Legislaturperiode, bringst Gesetze durch ein mehrstufiges politisches System und managst Kabinett, Koalitionspartner, Bundesrat, EU-Ebene und Kommunen — mit dem Ziel: Wiederwahl.

---

## Quick Start

### Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und Docker Compose
- Für lokale Entwicklung zusätzlich: Node.js (LTS), Python 3.11+, PostgreSQL 16 (oder nur DB per Docker)

### Mit Docker starten

```bash
git clone https://github.com/your-org/politikpraxis.git
cd politikpraxis
docker compose up --build
```

- **Frontend (Spiel):** http://localhost:8080
- **Backend-API:** unter `/api` erreichbar (Proxy über nginx)
- **Datenbank:** PostgreSQL 16 im Container, nur intern erreichbar

Zum Stoppen: `Ctrl+C` oder `docker compose down`.

### Docker Dev-Umgebung (Vite mit HMR)

Für Frontend-Entwicklung im echten `npm run dev`-Modus:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- **Frontend (Vite Dev Server):** http://localhost:5174
- **Backend (FastAPI mit Reload):** http://localhost:8000
- **API-Doku:** http://localhost:8000/api/docs

Stoppen:

```bash
docker compose -f docker-compose.dev.yml down
```

---

## Projektstruktur

| Ordner / Datei | Beschreibung |
|----------------|--------------|
| `frontend/` | React/TypeScript-Frontend (Vite, Phaser), Spiel-UI und -Logik |
| `backend/` | FastAPI-Backend, Datenbank (PostgreSQL), Alembic-Migrationen (019+) |
| `docs/` | MkDocs-Dokumentation (Game Design + Entwicklung) |
| `bundesrepublik_gdd.md` | Game Design Document (Single-Source für Spieldesign) |
| `docker-compose.yml` | Stack: DB, Backend, Frontend (nginx) |

---

## Tech-Stack

- **Frontend:** React 19, TypeScript, Vite, Phaser, Zustand, TanStack Query, i18next, react-router-dom
- **Backend:** FastAPI, SQLAlchemy 2, asyncpg, Alembic, Pydantic
- **Infrastruktur:** Docker, PostgreSQL 16, nginx

---

## API-Endpoints

| Prefix | Beschreibung |
|--------|--------------|
| `GET /api/health` | Health-Check |
| `POST /api/auth/register` | Registrierung |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Aktueller User (JWT) |
| `GET /api/saves` | Spielstände (JWT) |
| `GET/POST/PUT/DELETE /api/saves/{id}` | CRUD Spielstände |
| `GET /api/content/game?locale=de` | Volles Game-Content-Bundle |
| `GET /api/content/chars` | Charaktere |
| `GET /api/content/gesetze` | Gesetze |
| `GET /api/content/events` | Events |
| `GET /api/content/eu-events` | EU-Events |
| `GET /api/content/bundesrat` | Bundesrat-Fraktionen |
| `GET /api/content/milieus` | Milieus |
| `GET /api/content/politikfelder` | Politikfelder |
| `GET /api/content/verbaende` | Verbände |
| `POST /api/analytics/batch` | Analytics-Events (JWT) |
| `GET /api/analytics/summary` | Analytics-Summary |
| `GET /api/mods` | Mod-Liste |
| `GET /api/admin/*` | Admin-CRUD (Basic-Auth) |

API-Dokumentation: `/api/docs` (Swagger UI).

---

## Umgebungsvariablen (Backend)

Kopie von `backend/.env.example` nach `backend/.env`:

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | PostgreSQL-URL (asyncpg) |
| `SECRET_KEY` | JWT-Geheimschlüssel |
| `CORS_ORIGINS` | JSON-Array der erlaubten Origins |
| `ADMIN_USER` | Admin-Benutzername (Basic-Auth) |
| `ADMIN_PASSWORD` | Admin-Passwort |

---

## Dokumentation

Die ausführliche Dokumentation (Game Design + Entwicklung) wird mit **MkDocs** bereitgestellt.

- **Lokal ansehen:**  
  `pip install -r docs/requirements.txt` → `mkdocs serve` → http://127.0.0.1:8000  
- **Statisch bauen:**  
  `mkdocs build` → Ausgabe in `site/`

Inhalte:

- **Game Design:** Konzept, Core Loop, Spielsysteme, Komplexitätsstufen, UI, Roadmap, Designfragen
- **Entwicklung:** Lokales Setup, Projektstruktur, Architektur (State, API)

---

## Entwicklung (Kurz)

- **Frontend:** `cd frontend && npm install && npm run dev` (Vite i. d. R.: http://localhost:5173); Tests: `npm run test` bzw. `npm run test:watch` (Vitest)
- **Backend:** `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`, dann `alembic upgrade head` und `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- **Datenbank:** PostgreSQL 16 lauffähig (lokal oder `docker compose up db`)
- **Dokumentation:** siehe Abschnitt „Dokumentation“ oben

Details (inkl. Umgebungsvariablen, DB-URL) stehen in [docs/entwicklung/setup.md](docs/entwicklung/setup.md).

---

## Lizenz & Beitragen

*(Platzhalter: Lizenz und Hinweise zu Contributions können hier ergänzt werden.)*
