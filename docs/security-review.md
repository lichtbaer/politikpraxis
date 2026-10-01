# Sicherheits-Review — politikpraxis / Bundesrepublik

**Datum:** April 2026 (Status der Empfehlungen aktualisiert September 2026)  
**Fokus:** Datenspeicherung, API-Sicherheit, Dependency-Vulnerabilities, GameState-Manipulation

---

## 1. Dependency-Audit

### Frontend (npm audit)

```bash
cd frontend && npm audit --audit-level=moderate
```

**Hinweis:** In CI wird `npm audit --audit-level=critical` ausgeführt (siehe `.github/workflows/lint.yml`).

### Backend (pip-audit)

```bash
cd backend && pip install pip-audit && pip-audit -r requirements.txt
```

**Hinweis:** In CI wird `pip-audit -r backend/requirements.txt` ausgeführt (siehe `.github/workflows/lint.yml`).

**Backend requirements.txt:** Alle Pakete (inkl. transitiver) sind exakt gepinnt; Ausnahme ist `pydantic_core`, das `pydantic` selbst exakt pinnt. Updates kommen gruppiert über Dependabot (`.github/dependabot.yml`). Ein System-Scan (ohne Projekt-venv) zeigte CVEs in System-Paketen (ansible, jinja2, pip, etc.), die nicht Teil der Backend-Dependencies sind.

**Umgesetzt:** `pip-audit` läuft in CI (`lint.yml`, Job Backend) und blockiert den Deploy bei Findings.

---

## 2. API-Sicherheit (Backend)

### Admin-API (Basic-Auth, SMA-258)

| Prüfpunkt | Status | Details |
|-----------|--------|---------|
| Credentials nicht hardcoded | ✅ | `ADMIN_USER` und `ADMIN_PASSWORD` aus Umgebungsvariablen (Pydantic BaseSettings, `.env`) |
| Admin-API ohne Passwort | ✅ | Gibt 503 zurück, wenn `ADMIN_PASSWORD` fehlt |
| CORS-Konfiguration | ✅ | `cors_origins` aus Settings; in Produktion nur erlaubte Origins setzen |
| Rate-Limiting | ⚠️ | Empfehlung: Rate-Limiting für sensible Endpoints (Admin/Auth) prüfen/erzwingen (z. B. slowapi-Integration konsequent verwenden) |

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

**Status:** ✅ **CSP-Header in nginx.conf gesetzt** (SMA-314)

- `frontend/nginx.conf` setzt `Content-Security-Policy` mit `font-src 'self'` (blockiert externe Font-Quellen wie Google Fonts)
- `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self' http://localhost:* ws://localhost:*`
- Versehentliche externe Abhängigkeiten werden sofort sichtbar (Blockierung)

Falls Anthropic-API genutzt wird: `connect-src` muss `api.anthropic.com` erlauben.

---

## 5. DSGVO — Lokale Asset-Auslieferung (SMA-314)

**Status:** ✅ **Keine externen Ressourcen beim Seitenaufruf**

- **Google Fonts:** Ersetzt durch lokale @fontsource-Pakete (Playfair Display, DM Sans, DM Mono) — keine Requests an fonts.googleapis.com oder fonts.gstatic.com
- **GeoJSON:** Europa- und Deutschland-Karten liegen unter `frontend/public/geo/` (nicht mehr von raw.githubusercontent.com)
- **Build-Größe:** Fonts erhöhen das Bundle um ~200 kB (latin-Subset); GeoJSON ~2 MB (statisch, vom CDN getrennt)

**Rechtliche Relevanz:** Deutsche Gerichte haben wiederholt entschieden, dass Google Fonts ohne Einwilligung DSGVO-widrig sind. Für ein Bildungsspiel mit potenziellem Schuleinsatz ist die lokale Auslieferung entscheidend.

---

## 6. Anthropic-API-Key im Frontend

**Status:** ✅ **Kein API-Key im Frontend**

- Keine Treffer für `anthropic`, `ANTHROPIC`, `api_key` im Frontend
- API-Calls gehen über `VITE_API_URL` (Backend-Proxy)
- Keine Artifact-/LLM-Integration im aktuellen Codebase

**Empfehlung:** Falls künftig Anthropic genutzt wird: Key nur im Backend halten, Frontend ruft Backend-Proxy auf.

---

## 7. i18n-Injection (XSS)

**Status:** ✅ **DB-Texte werden als plain text gerendert**

- Kein `innerHTML`, `dangerouslySetInnerHTML` oder `insertAdjacentHTML` im Frontend
- Event/Char-Content (title, quote, context, bio) wird über React-JSX gerendert: `{title}`, `{context}` — React escaped automatisch
- Admin-API → DB → Frontend: Kein XSS-Risiko durch HTML-Injection

---

## 8. Secrets-Scan im Repo

```bash
git log --all --full-history -- "*.env"
git log --all -p | grep -i "password\|secret\|api_key\|token"
```

**Ergebnis:** ✅ **Kein Secrets-Leak**

- `.env` ist nicht in der Git-History (nur `.env.example` mit Platzhaltern)
- Gefundene Treffer: Dokumentation (SECRET_KEY, ADMIN_PASSWORD als Platzhalter), Test-Setup (`admin_password` für Tests), package-lock (js-tokens als Paketname) — alles unkritisch

**Umgesetzt:** `.env` und `.env.*` stehen in `.gitignore`; `gitleaks` scannt in CI jeden Push/PR (`lint.yml`).

---

## 9. Akzeptanzkriterien — Übersicht

| Kriterium | Status |
|-----------|--------|
| npm audit — keine high/critical ungepacht | ✅ |
| pip-audit — keine high/critical in Projekt-Dependencies | ✅ (in CI) |
| Admin-API-Credentials aus Env-Variablen | ✅ |
| locale-Parameter validiert | ✅ |
| GameState-Validierung beim localStorage-Load | ✅ (implementiert) |
| Keine API-Keys im Frontend-Bundle | ✅ |
| DB-Texte nie als innerHTML gerendert | ✅ |
| Kein Secrets-Leak in Git-History | ✅ |
| Keine externen Fonts/GeoJSON (DSGVO) | ✅ (SMA-314) |
| CSP-Header blockiert externe Fonts | ✅ |

---

## 10. Empfehlungen — Status

1. ~~**Rate-Limiting** für Admin-API~~ — erledigt: geteiltes Limit 30/min pro IP für alle Admin-Endpunkte, Zähler in Postgres (worker-übergreifend, #231; `admin_rate_limit` in `routes/admin.py`)
2. ~~**Dependency-Audits** in CI~~ — erledigt: `npm audit`, `pip-audit`, `bandit`, `gitleaks`, Trivy-Image-Scan in `lint.yml`; der Deploy läuft nur nach grünem Lint-Workflow. Offen bleibt die laufende Triage neuer Findings.
3. ~~**`.env`** in `.gitignore`~~ — erledigt (`.env`, `.env.*`)
4. ~~**CSP-Header** in nginx setzen~~ — erledigt (SMA-314)
5. **Offen:** CI-Actions und das gitleaks-Image auf feste Versionen/SHAs pinnen (#262)
