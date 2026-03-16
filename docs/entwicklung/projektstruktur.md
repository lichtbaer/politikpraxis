# Projektstruktur

Überblick über die wichtigsten Verzeichnisse und Dateien des Repositories.

---

## Root

| Eintrag | Beschreibung |
|--------|----------------|
| `README.md` | Projektbeschreibung, Quick Start, Tech-Stack, Link zur Doku |
| `mkdocs.yml` | MkDocs-Konfiguration (Navigation, Theme) |
| `docs/` | Quelltexte der MkDocs-Dokumentation |
| `docs/requirements.txt` | Python-Abhängigkeiten für MkDocs (mkdocs, mkdocs-material) |
| `bundesrepublik_gdd.md` | Game Design Document (Single-Source für Spieldesign) |
| `docker-compose.yml` | Stack: PostgreSQL, Backend, Frontend (nginx) |
| `frontend/` | React/TypeScript-Frontend der Politiksimulation |
| `backend/` | FastAPI-Backend, Alembic, Abhängigkeiten |

---

## Frontend (`frontend/`)

### Konfiguration

- `package.json` — Skripte: `dev`, `build`, `lint`, `preview`
- `vite.config.ts` — Vite + React-Plugin
- `tsconfig.json`, `tsconfig.app.json` — TypeScript
- `index.html` — Einstieg, Root für Vite
- `Dockerfile`, `nginx.conf` — Produktionsbuild und Auslieferung

### Quellcode (`frontend/src/`)

| Ordner/Datei | Inhalt |
|--------------|--------|
| `main.tsx` | Einstieg, Rendering der React-App |
| `App.tsx` | Wurzelkomponente, Einbindung Shell/Store |
| `core/` | Spiel-Logik, unabhängig von UI |
| `core/state.ts` | Erzeugung des initialen Game-State aus Content |
| `core/engine.ts` | Tick-Funktion, Log; ruft Systeme auf |
| `core/types.ts` | TypeScript-Typen (GameState, Law, Character, Event, …) |
| `core/validation.ts` | Validierung von Content/Spielstand |
| `core/systems/` | Einzelne Spielsysteme (parliament, economy, events, characters, coalition, levels, bundesrat, media, election, procgen) |
| `store/gameStore.ts` | Zustand-Store für Spielstate und Aktionen (tick, einbringen, lobbying, …) |
| `store/uiStore.ts` | UI-Zustand (z. B. Modals, Toasts) |
| `store/authStore.ts` | Authentifizierung (falls Backend-Auth genutzt wird) |
| `ui/` | React-Komponenten und Layout |
| `ui/layout/` | Shell, Header |
| `ui/panels/` | LeftPanel, CenterPanel, RightPanel |
| `ui/views/` | AgendaView, BundesratView, EbeneView, MediaView |
| `ui/components/` | AgendaCard, CharacterRow, CoalitionMeter, EventCard, KPITile, MilieuBar, ProgressBar, Toast, EndScreen, CharacterDetail |
| `ui/hooks/` | useGameTick, useGameActions, useAutoSave |
| `data/defaults/` | Szenarien, Gesetze, Events, Charaktere (Standard-Content) |
| `data/schemas/` | JSON-Schema für Content |
| `services/` | api, auth, content, saves, analytics, mods |
| `styles/` | global.css, tokens.css |
| `phaser/` | Phaser-Container und Szenen (z. B. Bundesrat-Visualisierung) |

---

## Backend (`backend/`)

| Eintrag | Beschreibung |
|--------|----------------|
| `requirements.txt` | Python-Abhängigkeiten (FastAPI, SQLAlchemy, asyncpg, Alembic, …) |
| `alembic.ini` | Konfiguration für Datenbank-Migrationen |
| `Dockerfile` | Python-Image, startet `uvicorn app.main:app` |
| `.env` | Lokale Umgebungsvariablen (nicht versioniert) |

Die Laufzeit erwartet ein Paket **`app`** unter `backend/` (z. B. `backend/app/main.py` mit FastAPI-Instanz `app`). Routen, Modelle und Migrationen liegen typischerweise unter `app/`. Ist diese Struktur noch nicht vorhanden, muss sie beim Aufsetzen des Backends angelegt werden.

---

## Dokumentation (`docs/`)

- `index.md` — Startseite der Doku, Links zu Game Design und Entwicklung
- `game-design/` — Aus dem GDD abgeleitete Seiten (Konzept, Core Loop, Spielsysteme, Komplexität, UI, Tech-Stack, Roadmap, Designfragen)
- `entwicklung/` — Setup, Projektstruktur, Architektur

Die Navigation wird in `mkdocs.yml` unter `nav` definiert.
