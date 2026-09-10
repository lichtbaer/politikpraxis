# Lokales Setup

Dieser Abschnitt beschreibt, wie du die Anwendung lokal (ohne vollständigen Docker-Stack) zum Laufen bringst.

---

## Voraussetzungen

- **Node.js** (LTS, z. B. 20.x) und npm
- **Python** 3.13 (für Backend und MkDocs)
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

   Vite startet typischerweise unter http://localhost:5173. `VITE_API_URL` muss **nicht** gesetzt werden: das Frontend ruft `/api` auf der eigenen Origin auf, und der Vite-Dev-Proxy (`frontend/vite.config.ts`) leitet an `http://127.0.0.1:8000` weiter. Läuft das Backend woanders, das Proxy-Ziel per `VITE_DEV_API_PROXY_TARGET` überschreiben — eine absolute `VITE_API_URL` umgeht den Proxy und macht jeden Request cross-origin.

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
- Optional: `DEBUG=true`. `CORS_ORIGINS` wird nur gebraucht, wenn das Frontend die API
  cross-origin aufruft — mit dem Vite-Proxy (Standard) ist das nicht der Fall.

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

Für API-Aufrufe gegen das lokale Backend ist nichts zu konfigurieren: der Vite-Dev-Proxy leitet `/api` an `http://127.0.0.1:8000` weiter. Anderer Backend-Host: `VITE_DEV_API_PROXY_TARGET=http://… npm run dev`.

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

- Frontend (Vite): **http://localhost:5174**
- Backend (FastAPI): http://localhost:8000 (Swagger: `http://localhost:8000/api/docs`)
- PostgreSQL: localhost:5432 (für lokale Tools; im Stack intern via Service `db`)

**Nicht die Vite-Network-URL benutzen:** Vite gibt beim Start zusätzlich eine
`Network:`-URL mit der Container-IP aus (z. B. `http://172.18.0.4:5173`). Das ist die
containerinterne Adresse — nutzt **http://localhost:5174**, sonst passen weder das
Port-Mapping noch HMR zuverlässig.

Das Frontend erreicht die API same-origin unter `/api`: `VITE_API_URL` steht im Dev-Stack
auf `/api`, und der Vite-Proxy leitet an den Service `backend` weiter
(`VITE_DEV_API_PROXY_TARGET=http://backend:8000`). Dadurch entstehen keine
Cross-Origin-Requests und `CORS_ORIGINS` spielt für den normalen Dev-Flow keine Rolle.
