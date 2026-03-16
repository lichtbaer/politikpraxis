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
docker-compose up --build
```

- **Frontend (Spiel):** http://localhost (Port 80)
- **Backend-API:** läuft im Container, von Frontend unter `/api` ansprechbar
- **Datenbank:** PostgreSQL 16 im Container, nur intern erreichbar

Zum Stoppen: `Ctrl+C` oder `docker-compose down`.

---

## Projektstruktur

| Ordner / Datei | Beschreibung |
|----------------|--------------|
| `frontend/` | React/TypeScript-Frontend (Vite, Phaser), Spiel-UI und -Logik |
| `backend/` | FastAPI-Backend, Datenbank (PostgreSQL), Alembic-Migrationen |
| `docs/` | MkDocs-Dokumentation (Game Design + Entwicklung) |
| `bundesrepublik_gdd.md` | Game Design Document (Single-Source für Spieldesign) |
| `docker-compose.yml` | Stack: DB, Backend, Frontend (nginx) |

---

## Tech-Stack

- **Frontend:** React 19, TypeScript, Vite, Phaser, Zustand, TanStack Query
- **Backend:** FastAPI, SQLAlchemy 2, asyncpg, Alembic, Pydantic
- **Infrastruktur:** Docker, PostgreSQL 16, nginx

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

- **Frontend:** `cd frontend && npm install && npm run dev` (Vite Dev Server)
- **Backend:** Python-Umgebung mit `backend/requirements.txt`, DB lauffähig (lokal oder Docker), dann `alembic upgrade head` und `uvicorn app.main:app --reload`
- **Dokumentation:** siehe Abschnitt „Dokumentation“ oben

Details (inkl. Umgebungsvariablen, DB-URL) stehen in [docs/entwicklung/setup.md](docs/entwicklung/setup.md).

---

## Lizenz & Beitragen

*(Platzhalter: Lizenz und Hinweise zu Contributions können hier ergänzt werden.)*
