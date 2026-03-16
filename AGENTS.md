# AGENTS.md — Anweisungen für AI-Coding-Agents

Dieses Dokument richtet sich an AI-Coding-Agents (Cursor, GitHub Copilot, etc.) und beschreibt Kontext, Konventionen und Befehle für das Projekt **politikpraxis**.

---

## Projektüberblick

**politikpraxis** ist die browserbasierte Politiksimulation **Bundesrepublik**. Der Spieler führt eine Bundesregierung durch eine 4-jährige Legislaturperiode, bringt Gesetze durch ein mehrstufiges politisches System und managt Kabinett, Koalitionspartner, Bundesrat, EU-Ebene und Kommunen — mit dem Ziel: Wiederwahl.

---

## Tech-Stack

| Bereich | Technologien |
|---------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Phaser, Zustand, TanStack Query |
| **Backend** | FastAPI, SQLAlchemy 2, asyncpg, Alembic, Pydantic |
| **Infrastruktur** | Docker, PostgreSQL 16, nginx |

---

## Projektstruktur

```
/
├── frontend/          # React/TypeScript-Frontend (Vite, Phaser)
│   └── src/
│       ├── core/      # Spiel-Logik (engine, state, types, systems)
│       ├── store/     # Zustand-Stores (gameStore, uiStore, authStore)
│       ├── ui/        # React-Komponenten (layout, panels, views, components)
│       ├── data/      # Szenarien, Gesetze, Events, Charaktere
│       ├── services/  # API, Auth, Content, Saves
│       └── phaser/    # Phaser-Szenen
├── backend/           # FastAPI-Backend
│   └── app/           # FastAPI-App, Routen, Modelle
├── docs/              # MkDocs-Dokumentation
│   ├── game-design/   # Konzept, Core Loop, Spielsysteme
│   └── entwicklung/  # Setup, Architektur
├── bundesrepublik_gdd.md  # Game Design Document (Single-Source)
└── docker-compose.yml
```

---

## Entwicklungsumgebung

### Starten (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost (Port 80)
- Backend-API: unter `/api` erreichbar

### Frontend lokal

```bash
cd frontend
npm install
npm run dev
```

Vite: http://localhost:5173. Für API: `VITE_API_URL=http://localhost:8000/api` setzen.

### Backend lokal

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Build & Lint

| Befehl | Ort | Beschreibung |
|--------|-----|--------------|
| `npm run build` | `frontend/` | TypeScript-Check + Vite-Build |
| `npm run lint` | `frontend/` | ESLint |
| `mkdocs build` | Root | Statischer Doku-Build |
| `mkdocs serve` | Root | Doku lokal (http://127.0.0.1:8000) |

---

## Architektur-Regeln (Frontend)

1. **State-Management:** Zustand (`gameStore`, `uiStore`) — keine Redux.
2. **Spielzustand:** Nur über Aktionen im `gameStore` ändern (`gameTick`, `doEinbringen`, `doLobbying`, etc.).
3. **Tick-System:** `engine.tick(state, content)` in `frontend/src/core/engine.ts` ruft nacheinander die Systeme in `core/systems/` auf.
4. **Typen:** Alle Game-Typen in `frontend/src/core/types.ts` (`GameState`, `Law`, `Character`, etc.).
5. **API:** `frontend/src/services/api.ts` mit `apiFetch`, Basis-URL aus `VITE_API_URL`.

---

## Backend-Struktur

- FastAPI-Instanz in `backend/app/main.py`
- SQLAlchemy 2 (async, asyncpg), Migrationen mit Alembic
- Umgebungsvariablen: `DATABASE_URL`, `SECRET_KEY`, optional `DEBUG`, `CORS_ORIGINS`

---

## Wichtige Referenzen

- **Game Design:** `bundesrepublik_gdd.md`, `docs/game-design/`
- **Setup & Architektur:** `docs/entwicklung/setup.md`, `docs/entwicklung/architektur.md`
- **Projektstruktur:** `docs/entwicklung/projektstruktur.md`

---

## Konventionen für Agents

- **Sprache:** Code-Kommentare und Commit-Messages auf Deutsch oder Englisch — konsistent halten.
- **Neue Features:** Game-Design in `bundesrepublik_gdd.md` und `docs/game-design/` prüfen.
- **State-Änderungen:** Nur über gameStore-Aktionen; keine direkten Mutations.
- **API-Änderungen:** Backend- und Frontend-Services synchron halten.
- **Dokumentation:** Bei größeren Änderungen `docs/` aktualisieren.
