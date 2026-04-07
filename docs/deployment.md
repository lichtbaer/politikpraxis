# Deployment (Produktion)

Dieses Dokument beschreibt das Produktions-Deployment mit **Docker Compose**, **nginx** als Reverse Proxy, **Let's Encrypt** (SSL) und **GitHub Actions** für CI/CD bei Push auf `main`.

**Laufender Betrieb** (Zertifikate, Volumes, Logs, Backups): [Produktivbetrieb mit Docker](entwicklung/produktivbetrieb-docker.md).

## Architektur (Kurz)

- **nginx** (Ports 80/443): TLS-Terminierung, HTTP und Apex-HTTPS → **kanonisch https://www.politikpraxis.de**, Proxy für `/api/` → Backend, sonst Frontend-SPA.
- **frontend**: gebautes Vite-Static-Asset, interner nginx nur für `try_files` (SPA-Fallback).
- **backend**: FastAPI (Uvicorn), Alembic-Migrationen beim Container-Start.
- **db**: PostgreSQL 16.
- **certbot**: periodisches `certbot renew` (gemeinsame Volumes mit nginx für ACME).

Zero-Downtime-Updates: `docker compose ... up -d --remove-orphans` (kein harter `stop`/`start`).

## Voraussetzungen auf dem Server

- Docker und Docker Compose Plugin (`docker compose`)
- Git-Repository unter z. B. `/opt/politikpraxis` (wie im Workflow)
- DNS: `politikpraxis.de` und `www.politikpraxis.de` zeigen auf die Server-IP
- Port 80/443 erreichbar (für ACME HTTP-01 und HTTPS)

## Server-seitige `.env`

Im Projektverzeichnis (neben `docker-compose.prod.yml`) eine `.env` anlegen — **nicht** committen. Beispielwerte:

```bash
# PostgreSQL (Compose)
POSTGRES_DB=politikpraxis
POSTGRES_USER=pp_user
POSTGRES_PASSWORD=<sicheres-passwort>

# asyncpg-URL (Host „db“ = Service-Name in Compose)
DATABASE_URL=postgresql+asyncpg://pp_user:<pass>@db:5432/politikpraxis

# Auth / API
SECRET_KEY=<64-Byte-Zufallsstring>
CORS_ORIGINS=["https://politikpraxis.de","https://www.politikpraxis.de"]
FRONTEND_BASE_URL=https://www.politikpraxis.de
PUBLIC_API_BASE_URL=https://www.politikpraxis.de/api

DEBUG=false

# SMTP (Magic-Link, Kontakt)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USER=kontakt@politikpraxis.de
SMTP_PASSWORD=...
MAIL_FROM=kontakt@politikpraxis.de
CONTACT_RECIPIENT=kontakt@politikpraxis.de

# Admin-API
ADMIN_USER=admin
ADMIN_PASSWORD=<sicheres-passwort>

# Frontend-Build (nur Build-Args / Compose-Substitution)
VITE_REGISTRATION_NUMBER=<HRB … nach UG-Eintragung>
```

Hinweis: Die Anwendung liest `SECRET_KEY` (nicht `JWT_SECRET`). Siehe `backend/.env.example`.

**CORS:** Beide Origins in `CORS_ORIGINS` eintragen — nginx leitet Apex auf www um; für API-Aufrufe kann die Origin kurzzeitig noch der Apex-Host sein.

## Erstmalig: SSL-Zertifikat (Let's Encrypt)

Die mitgelieferte `nginx/nginx.conf` referenziert Dateien unter `/etc/letsencrypt/live/politikpraxis.de/`. **Solange diese noch nicht existieren, startet nginx nicht** — Zertifikate müssen also zuerst liegen oder die Konfiguration wird temporär angepasst.

### Variante A — Webroot (empfohlen, wenn Port 80 frei ist)

1. Temporär eine **nur-HTTP**-nginx-Konfiguration verwenden (nur `listen 80;`, gleiche `/.well-known/acme-challenge/`-Location, **kein** Redirect auf HTTPS und **kein** `listen 443`-Block), `docker compose ... up -d`.
2. Dann Zertifikat holen:

```bash
cd /opt/politikpraxis
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email kontakt@politikpraxis.de \
  --agree-tos \
  --no-eff-email \
  -d politikpraxis.de \
  -d www.politikpraxis.de
```

3. Produktions-`nginx/nginx.conf` (mit HTTPS) wieder einbinden, Stack neu starten:

```bash
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml restart nginx
```

### Variante B — Standalone (wenn nichts auf Port 80 lauscht)

Alle Dienste stoppen, die Port 80 belegen, dann z. B.:

```bash
docker compose -f docker-compose.prod.yml run --rm -p 80:80 certbot certonly --standalone \
  --email kontakt@politikpraxis.de \
  --agree-tos \
  --no-eff-email \
  -d politikpraxis.de \
  -d www.politikpraxis.de
```

Anschließend vollständigen Stack mit `nginx/nginx.conf` starten.

Der Service **certbot** im Compose-Stack führt regelmäßig `certbot renew` aus (gemeinsame Volumes mit nginx). Nach erfolgreicher Erneuerung ggf. `nginx` neu laden (`docker compose ... exec nginx nginx -s reload`), falls laufende Prozesse alte Zertifikate im Speicher halten.

## Manuelles Deployment

```bash
cd /opt/politikpraxis
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker system prune -f
```

## GitHub Actions CI/CD

Workflow: `.github/workflows/deploy.yml`

- Bei Push auf **main**: Backend-Tests (`pytest`), Frontend-Build (`npm run build`), danach SSH-Deploy auf den Server.

---

## Dokumentation (MkDocs) via GitHub Pages

Zusätzlich zur App-Deployment-Pipeline gibt es einen separaten Docs-Workflow:

- Workflow: `.github/workflows/docs.yml`
- Trigger: Push auf `main` (deploy) und Pull Requests (Build-Check)
- Build: `pip install -r docs/requirements.txt` → `mkdocs build --strict`
- Veröffentlichung: GitHub Pages

Die öffentliche Docs-URL ist in `mkdocs.yml` als `site_url` hinterlegt (GitHub Pages).

### Benötigte GitHub Secrets

| Secret | Bedeutung |
|--------|-----------|
| `DEPLOY_HOST` | Hostname oder IP des Servers |
| `DEPLOY_USER` | SSH-Benutzer (dedizierter `deploy`-User, **kein** root/sudo) |
| `DEPLOY_SSH_KEY` | Privater Ed25519-SSH-Key (Deploy-Key) |

### SSH Deploy-Key absichern

Der `DEPLOY_SSH_KEY` sollte **minimale Rechte** haben:

1. **Dedizierten Deploy-User anlegen** (kein sudo, kein Login-Shell nötig):
   ```bash
   adduser --disabled-password --gecos "" deploy
   chown -R deploy:deploy /opt/politikpraxis
   ```

2. **Ed25519-Schlüsselpaar erzeugen** (lokal, nicht auf dem Server):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
   # Privaten Key (deploy_key) als GitHub Secret DEPLOY_SSH_KEY hinterlegen
   # Öffentlichen Key (deploy_key.pub) auf dem Server eintragen (s. u.)
   ```

3. **Öffentlichen Key mit Forced Command in `~deploy/.ssh/authorized_keys` eintragen:**
   ```
   command="/opt/politikpraxis/deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA...
   ```

4. **Deploy-Script `/opt/politikpraxis/deploy.sh` anlegen** (nur die nötigen Befehle):
   ```bash
   #!/bin/bash
   set -e
   cd /opt/politikpraxis
   git pull origin main
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker system prune -f
   ```
   Rechte setzen: `chmod 750 /opt/politikpraxis/deploy.sh`

5. **Key-Rotation:** Den Deploy-Key mindestens jährlich und bei Teamveränderungen rotieren.


## nginx: Sicherheit

In `nginx/nginx.conf` u. a.: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP. Bei Domain-Änderung `server_name` und Pfade zu `ssl_certificate` anpassen (Let's Encrypt-Verzeichnis folgt dem ersten `-d`).

## Troubleshooting

- **502 Bad Gateway**: Prüfen, ob `backend` und `frontend` im gleichen Netzwerk `internal` laufen und gesund sind (`docker compose ps`, Logs).
- **API 404**: FastAPI-Routen beginnen mit `/api/` — der Proxy muss `proxy_pass http://backend:8000/api/;` nutzen (siehe Repo).
- **CORS**: `CORS_ORIGINS` in der Server-`.env` muss die öffentliche Origin(n) enthalten.
