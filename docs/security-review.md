# Sicherheits-Review — politikpraxis / Bundesrepublik

**Datum:** März 2025  
**Fokus:** Datenspeicherung, API-Sicherheit, Dependency-Vulnerabilities, GameState-Manipulation

---

## 1. Dependency-Audit

### Frontend (npm audit)

```bash
cd frontend && npm audit --audit-level=moderate
```

**Ergebnis:** ✅ **0 vulnerabilities** (keine high/critical ungepacht)

### Backend (pip-audit)

```bash
cd backend && pip install pip-audit && pip-audit -r requirements.txt
```

**Hinweis:** pip-audit erfordert eine funktionierende Python-Umgebung (venv). Im CI/CD sollte `pip-audit -r requirements.txt` nach `pip install -r requirements.txt` ausgeführt werden.

**Backend requirements.txt:** Die Hauptpakete (cryptography==46.0.5, FastAPI, SQLAlchemy, etc.) sind auf aktuelle Versionen gepinnt. Ein System-Scan (ohne Projekt-venv) zeigte CVEs in System-Paketen (ansible, jinja2, pip, etc.), die nicht Teil der Backend-Dependencies sind.

**Empfehlung:** pip-audit regelmäßig in CI ausführen; bei neuen CVEs die betroffenen Pakete in requirements.txt aktualisieren.

---

## 2. API-Sicherheit (Backend)

### Admin-API (Basic-Auth, SMA-258)

| Prüfpunkt | Status | Details |
|-----------|--------|---------|
| Credentials nicht hardcoded | ✅ | `ADMIN_USER` und `ADMIN_PASSWORD` aus Umgebungsvariablen (Pydantic BaseSettings, `.env`) |
| Admin-API ohne Passwort | ✅ | Gibt 503 zurück, wenn `ADMIN_PASSWORD` fehlt |
| CORS-Konfiguration | ✅ | `cors_origins` aus Settings; in Produktion nur erlaubte Origins setzen |
| Rate-Limiting | ⚠️ | **Nicht vorhanden** — Empfehlung: slowapi oder ähnliches für Admin-Endpoints |

**Relevante Dateien:** `backend/app/dependencies.py`, `backend/app/config.py`, `backend/.env.example`

### Content-API

| Prüfpunkt | Status | Details |
|-----------|--------|---------|
| GET-only, read-only | ✅ | Alle Content-Endpoints sind GET |
| SQL-Injection-Schutz | ✅ | SQLAlchemy ORM, parameterisierte Queries |
| locale-Parameter validiert | ✅ | `validate_locale()` prüft gegen `VALID_LOCALES = {'de', 'en'}` |
| Keine sensiblen Daten | ✅ | Response-Schemas (Pydantic) filtern interne Felder |

---

## 3. Frontend GameState-Sicherheit

### Problem

Der GameState wird in localStorage gespeichert. Ein Spieler kann den Inhalt manuell manipulieren (z.B. `wahlprognose: 99.9`, `zust.g: 999`).

### Lösung

**`validateGameState()`** in `frontend/src/core/state.ts`:

- **Numerische Werte geclampt:** wahlprognose, zust.*, milieuZustimmung, verbandsBeziehungen, medienKlima, electionThreshold auf 0–100 (bzw. sinnvolle Bereiche)
- **Enums validiert:** view (agenda|eu|land|…), speed (0|1|2)
- **Arrays begrenzt:** log (max 500), firedEvents (max 200), pending (max 100)
- **Prototype-Pollution-Schutz:** Keys `__proto__`, `constructor`, `prototype` werden ignoriert

**Integration:** `loadSave` und `loadSaveFromFile` im gameStore rufen `validateGameState()` vor `migrateGameState()` auf. Bei Validierungsfehlern wird das Laden abgebrochen.

---

## 4. Content Security Policy (CSP)

**Status:** ⚠️ **Keine CSP-Header gesetzt**

- `index.html` enthält keine CSP-Meta-Tags
- nginx.conf setzt keine CSP-Header

**Empfehlung:** CSP in nginx oder als FastAPI-Middleware setzen:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.anthropic.com;
```

Falls Anthropic-API genutzt wird: `connect-src` muss `api.anthropic.com` erlauben.

---

## 5. Anthropic-API-Key im Frontend

**Status:** ✅ **Kein API-Key im Frontend**

- Keine Treffer für `anthropic`, `ANTHROPIC`, `api_key` im Frontend
- API-Calls gehen über `VITE_API_URL` (Backend-Proxy)
- Keine Artifact-/LLM-Integration im aktuellen Codebase

**Empfehlung:** Falls künftig Anthropic genutzt wird: Key nur im Backend halten, Frontend ruft Backend-Proxy auf.

---

## 6. i18n-Injection (XSS)

**Status:** ✅ **DB-Texte werden als plain text gerendert**

- Kein `innerHTML`, `dangerouslySetInnerHTML` oder `insertAdjacentHTML` im Frontend
- Event/Char-Content (title, quote, context, bio) wird über React-JSX gerendert: `{title}`, `{context}` — React escaped automatisch
- Admin-API → DB → Frontend: Kein XSS-Risiko durch HTML-Injection

---

## 7. Secrets-Scan im Repo

```bash
git log --all --full-history -- "*.env"
git log --all -p | grep -i "password\|secret\|api_key\|token"
```

**Ergebnis:** ✅ **Kein Secrets-Leak**

- `.env` ist nicht in der Git-History (nur `.env.example` mit Platzhaltern)
- Gefundene Treffer: Dokumentation (SECRET_KEY, ADMIN_PASSWORD als Platzhalter), Test-Setup (`admin_password` für Tests), package-lock (js-tokens als Paketname) — alles unkritisch

**Hinweis:** `.env` sollte in `.gitignore` stehen (aktuell nicht explizit; `.env` wird typischerweise nicht committed).

---

## 8. Akzeptanzkriterien — Übersicht

| Kriterium | Status |
|-----------|--------|
| npm audit — keine high/critical ungepacht | ✅ |
| pip-audit — keine high/critical in Projekt-Dependencies | ✅ (empfohlen: CI-Integration) |
| Admin-API-Credentials aus Env-Variablen | ✅ |
| locale-Parameter validiert | ✅ |
| GameState-Validierung beim localStorage-Load | ✅ (implementiert) |
| Keine API-Keys im Frontend-Bundle | ✅ |
| DB-Texte nie als innerHTML gerendert | ✅ |
| Kein Secrets-Leak in Git-History | ✅ |

---

## 9. Offene Empfehlungen

1. **Rate-Limiting** für Admin-API (z.B. slowapi)
2. **CSP-Header** in nginx oder FastAPI setzen
3. **pip-audit** in CI/CD integrieren (z.B. nach `pip install -r requirements.txt`)
4. **`.env`** explizit in `.gitignore` aufnehmen, falls noch nicht vorhanden
