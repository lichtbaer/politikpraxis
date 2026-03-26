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

- `package.json` — Skripte: `dev`, `build`, `lint`, `preview`, `test`, `test:watch`
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
| `core/systems/` | Spielsysteme: parliament, economy, characters, coalition, koalition, events, election, levels, bundesrat, media, procgen, gesetzLebenszyklus, haushalt, ministerialInitiativen, eu, milieus, verbaende, wahlprognose, kongruenz, politikfeldDruck, ausrichtung, features (plus Testdateien) |
| `store/gameStore.ts` | Zustand-Store für Spielstate und Aktionen (tick, einbringen, lobbying, …) |
| `store/uiStore.ts` | UI-Zustand (z. B. Modals, Toasts) |
| `store/authStore.ts` | Authentifizierung (falls Backend-Auth genutzt wird) |
| `stores/contentStore.ts` | Content-Store (Sprecher-Ersatz, Landtagswahl-Transitions etc.) |
| `types/content.ts` | Content-Typen (ContentBundle, Szenarien, …) |
| `i18n.ts` | i18next-Konfiguration, Mehrsprachigkeit (DE/EN) |
| `ui/` | React-Komponenten und Layout |
| `ui/layout/` | Shell, Header |
| `ui/panels/` | LeftPanel, CenterPanel, RightPanel |
| `ui/views/` | AgendaView, BundesratView, EbeneView, MediaView |
| `ui/screens/` | MainMenu, GameView, Setup, LoadingScreen |
| `ui/components/` | AgendaCard, CharacterRow, CoalitionMeter, EventCard, KPITile, MilieuBar, ProgressBar, Toast, EndScreen, CharacterDetail |
| `ui/hooks/` | useGameTick, useGameActions, useAutoSave |
| `data/defaults/` | Szenarien, Gesetze, Events, Charaktere (Standard-Content) |
| `data/schemas/` | JSON-Schema für Content |
| `services/` | api, auth, content, saves, analytics, mods, localStorageSave |
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
| `pytest.ini` | Konfiguration für Tests |
| `tests/` | API-Tests (z. B. test_admin_api, test_content_api) |
| `tests/simulation/` | *Entfernt* — Balance-Simulation jetzt in `frontend/src/core/simulation/` |

Die Laufzeit erwartet ein Paket **`app`** unter `backend/`. Aktuelle Struktur unter `app/`:

| Ordner/Datei | Inhalt |
|--------------|--------|
| `main.py` | FastAPI-Instanz, CORS, Router-Einbindung |
| `config.py` | Einstellungen (Pydantic Settings) |
| `dependencies.py` | Abhängigkeiten für Routen |
| `routes/` | auth, saves, content, analytics, mods, admin |
| `models/` | user, save, content, analytics, mod (SQLAlchemy) |
| `schemas/` | Pydantic-Schemas pro Modul |
| `services/` | auth_service, save_service, content_service, content_db_service, analytics_service, mod_validator, … |
| `db/` | database.py, migrations/ (Alembic) |
| `content/` | YAML-Daten (scenarios/, laws/, characters/, events/) |

---

## Dokumentation (`docs/`)

- `index.md` — Startseite der Doku, Links zu Game Design und Entwicklung
- `game-design/` — Aus dem GDD abgeleitete Seiten (Konzept, Core Loop, Spielsysteme, Komplexität, UI, Tech-Stack, Roadmap, Designfragen)
- `entwicklung/` — Setup, Projektstruktur, Architektur

Die Navigation wird in `mkdocs.yml` unter `nav` definiert.
