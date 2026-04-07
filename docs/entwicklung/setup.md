# Lokales Setup

Dieser Abschnitt beschreibt, wie du die Anwendung lokal (ohne vollständigen Docker-Stack) zum Laufen bringst.

---

## Voraussetzungen

- **Node.js** (LTS, z. B. 20.x) und npm
- **Python** 3.11 oder 3.13 (für Backend und MkDocs)
- **PostgreSQL** 16 (lokal installiert oder per Docker nur für die DB)

---

## Option A: Alles mit Docker

Aus dem Projektroot:

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend läuft im Container und ist vom Frontend unter `/api` erreichbar (Proxy über nginx).

---

## Option B: Frontend lokal, Backend + DB in Docker

1. **Datenbank + Backend starten (ohne Frontend-Container):**

   ```bash
   docker compose up --build db backend
   ```

2. **Frontend lokal:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Vite startet typischerweise unter http://localhost:5173. Damit das Frontend die API erreicht, muss `VITE_API_URL` auf die Backend-URL zeigen (z. B. `http://localhost:8000/api`). Entweder in `.env` im `frontend/`-Ordner setzen oder beim Aufruf: `VITE_API_URL=http://localhost:8000/api npm run dev`.

3. **Produktion lokal testen (Frontend gebaut, nginx):**  
   Vollständig `docker compose up --build` nutzen.

---

## Option C: Alles lokal (ohne Docker)

### 1. PostgreSQL

PostgreSQL 16 lauffähig, Datenbank `bundesrepublik` anlegen (Benutzer/Passwort z. B. `postgres`/`postgres` oder an `.env` anpassen).

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Umgebungsvariablen (z. B. in `backend/.env`):

- `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bundesrepublik`
- `SECRET_KEY=<geheimer Schlüssel für JWT/Sessions>`
- Optional: `DEBUG=true`, `CORS_ORIGINS='["http://localhost:5173"]'`

Migrationen ausführen und Server starten:

```bash
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Die Anwendung erwartet ein Python-Paket `app` im `backend/`-Verzeichnis (z. B. `backend/app/main.py` mit FastAPI-Instanz `app`). Ist die `app`-Struktur noch nicht angelegt, muss sie gemäß Backend-Architektur ergänzt werden.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Für API-Aufrufe gegen das lokale Backend: `VITE_API_URL=http://localhost:8000/api` setzen (z. B. in `frontend/.env`).

---

## Dokumentation (MkDocs) lokal ansehen

```bash
pip install -r docs/requirements.txt
mkdocs serve
```

Doku: http://127.0.0.1:8000 (Port kann bei Belegung abweichen).

**Statischer Build:**

```bash
mkdocs build
```

Ausgabe in `site/`.

---

## Docker Dev-Umgebung (Vite mit HMR)

Für eine Docker-basierte Entwicklungsumgebung mit echtem Vite-Dev-Server (HMR) nutzt ihr:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend (Vite): http://localhost:5174
- Backend (FastAPI): http://localhost:8000 (API: `http://localhost:8000/api`)
- PostgreSQL: localhost:5432 (für lokale Tools; im Stack intern via Service `db`)
