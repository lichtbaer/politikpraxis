# Produktivbetrieb mit Docker

Handbuch für den **laufenden Betrieb** des Produktions-Stacks: Container, Volumes, TLS-Zertifikate, Erneuerung, Logs und typische Wartungsaufgaben. Erstinstallation, `.env`-Beispiele und CI/CD sind in [Deployment (Produktion)](../deployment.md) beschrieben.

---

## Stack-Überblick

| Komponente | Compose-Service | Rolle |
|------------|-----------------|-------|
| Reverse Proxy + TLS | `nginx` | Ports 80/443, ACME-Webroot, Proxy zu Frontend & Backend |
| TLS-Erneuerung | `certbot` | Periodisch `certbot renew` (Volumes mit nginx geteilt) |
| Anwendung API | `backend` | FastAPI/Uvicorn, Alembic beim Start |
| Anwendung UI | `frontend` | Statisches SPA (intern Port 80), kein direkter Host-Port |
| Datenbank | `db` | PostgreSQL 16, Daten auf Docker-Volume `pgdata` |

Datei: [`docker-compose.prod.yml`](https://github.com/lichtbaer/politikpraxis/blob/main/docker-compose.prod.yml) im Repository-Root — immer mit `-f docker-compose.prod.yml` und **serverseitiger** `.env` im gleichen Verzeichnis ausführen.

Netzwerk: alle Dienste hängen am Bridge-Netz `internal`; von außen sind nur **nginx** (80/443) exponiert.

---

## Wichtige Volumes

| Volume | Inhalt |
|--------|--------|
| `pgdata` | PostgreSQL-Datenverzeichnis — **Backup-Ziel Nr. 1** |
| `certbot_conf` | Let's Encrypt: `/etc/letsencrypt` (Zertifikate, Keys, Renewal-Konfiguration) |
| `certbot_www` | ACME HTTP-01 Challenge unter `/var/www/certbot` (geteilt mit nginx) |

Volumes sind **Docker-managed**. Bei `docker volume rm …` sind Daten weg — Backups vor Löschungen.

Bind-Mount:

- `./nginx/nginx.conf` → Produktions-nginx (TLS, Proxy, Security-Header). Änderungen erfordern reload/newstart von `nginx`.

---

## Zertifikate (Let's Encrypt)

### Wo liegen die Dateien?

In den Containern `nginx` und `certbot` ist `certbot_conf` auf **`/etc/letsencrypt`** gemountet. Die Repo-`nginx/nginx.conf` erwartet (Standard-Setup) u. a.:

- `fullchain.pem` / `privkey.pem` unter `/etc/letsencrypt/live/<Zertifikatsname>/`

Der übliche Name entspricht der **ersten** mit `certbot certonly … -d` angegebenen Domain (im Projektbeispiel: `politikpraxis.de` → Pfade wie `live/politikpraxis.de/`). Bei **eigener Domain** müssen `server_name`, `ssl_certificate` und `certbot -d` konsistent sein — siehe auch [Deployment — nginx: Sicherheit](deployment.md).

### Erstausstellung

Die mitgelieferte [`nginx/nginx.conf`](https://github.com/lichtbaer/politikpraxis/blob/main/nginx/nginx.conf) verweist auf Dateien unter `/etc/letsencrypt/live/…` (z. B. `…/live/politikpraxis.de/`). **Existieren diese Dateien noch nicht, startet nginx mit dieser Konfiguration nicht** — ihr braucht daher **einmalig** ein Zertifikat, bevor die volle TLS-Konfiguration aktiv sein darf.

Voraussetzungen:

- DNS: **A** (und ggf. **AAAA**) für Apex und `www` zeigen auf den Server.
- Port **80** von außen erreichbar (Let's Encrypt HTTP-01).
- Ihr arbeitet im Projektverzeichnis auf dem Server (z. B. `cd /opt/politikpraxis`).
- Platzhalter wie `deine-domain.de` / E-Mail durch echte Werte ersetzen.
- Der **erste** `-d`-Name bei `certbot` bestimmt den Ordner unter `live/` (z. B. `-d politikpraxis.de` zuerst → `live/politikpraxis.de/`). Die Pfade `ssl_certificate` und `ssl_certificate_key` in der Produktions-`nginx.conf` müssen **zu genau diesem Namen** passen — sonst nginx nach dem Wechsel auf HTTPS wieder mit Fehler beenden.

---

#### Variante A — Webroot (empfohlen, wenn nginx Port 80 nutzen soll)

Ziel: Ein minimaler nginx beantwortet nur `/.well-known/acme-challenge/…` über das Volume **`certbot_www`** (`/var/www/certbot` im Container). Certbot schreibt die Challenge-Datei dort hin, Let's Encrypt lädt sie per HTTP ab.

1. **Sicherung der Produktionskonfiguration** (einmalig):

   ```bash
   cp nginx/nginx.conf nginx/nginx.conf.production
   ```

2. **`nginx/nginx.conf` temporär durch eine Nur-HTTP-Datei ersetzen** — nur `listen 80`, **kein** `listen 443`, **keine** `ssl_certificate`-Zeilen. Minimalbeispiel (Domains anpassen):

   ```nginx
   events { worker_connections 1024; }
   http {
       include       /etc/nginx/mime.types;
       default_type  application/octet-stream;
       server {
           listen 80;
           server_name deine-domain.de www.deine-domain.de;
           location /.well-known/acme-challenge/ {
               root /var/www/certbot;
           }
           location / {
               return 503;
           }
       }
   }
   ```

3. **Stack mit Compose starten** (wie gewohnt; `nginx` braucht keine Zertifikatsdateien mehr, solange nur Port 80 konfiguriert ist):

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   Prüfen, dass `nginx` läuft und Port 80 von außen die Challenge-URL erreichen kann (für den nächsten Schritt reicht ein erreichbarer Server auf Port 80).

4. **Zertifikat ausstellen** (Volumes `certbot_conf` / `certbot_www` werden vom `certbot`-Service wie in `docker-compose.prod.yml` verwendet):

   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot \
     --webroot-path=/var/www/certbot \
     --email deine-mail@beispiel.de \
     --agree-tos \
     --no-eff-email \
     -d deine-domain.de \
     -d www.deine-domain.de
   ```

   Bei Erfolg liegen u. a. `fullchain.pem` und `privkey.pem` im Volume unter `live/<erster--d-Name>/`.

5. **Produktions-nginx wiederherstellen** und TLS aktiv schalten:

   ```bash
   mv nginx/nginx.conf.production nginx/nginx.conf
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker compose -f docker-compose.prod.yml exec nginx nginx -t
   docker compose -f docker-compose.prod.yml restart nginx
   ```

   `nginx -t` muss **ohne Fehler** durchlaufen; sonst Pfade in `nginx.conf` oder Reihenfolge der `-d`-Domains prüfen.

---

#### Variante B — Standalone (wenn Port 80 kurz „frei“ sein kann)

Ziel: Certbot lauscht **selbst** kurz auf Port 80. Alle anderen Dienste auf Port 80 müssen **gestoppt** sein (inkl. nginx-Container dieses Stacks).

1. Projekt-Dienste stoppen, die 80/443 belegen:

   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

2. **Einmalig Zertifikat holen** (Port 80 wird an den Certbot-Container durchgereicht; Daten landen wieder im Volume `certbot_conf`):

   ```bash
   docker compose -f docker-compose.prod.yml run --rm -p 80:80 certbot certonly --standalone \
     --email deine-mail@beispiel.de \
     --agree-tos \
     --no-eff-email \
     -d deine-domain.de \
     -d www.deine-domain.de
   ```

3. **Vollen Produktions-Stack** mit der echten `nginx/nginx.conf` (HTTPS) starten:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

---

Ergänzende Hinweise zu `.env`, CORS und Deploy-Pipeline: [Deployment (Produktion)](deployment.md).

### Erneuerung im laufenden Betrieb

Der Service `certbot` führt in einer Schleife etwa alle **12 Stunden** `certbot renew` aus (siehe `entrypoint` in `docker-compose.prod.yml`). Let's Encrypt-Zertifikate werden typischerweise erst kurz vor Ablauf erneuert; `renew` ist idempotent.

**Wichtig:** Nach erfolgreicher Erneuerung laden laufende **nginx**-Worker ggf. noch die alten Zertifikate aus dem Speicher. Empfehlung nach Renew (oder regelmäßig, z. B. via Cron auf dem Host):

```bash
cd /opt/politikpraxis   # oder euer Projektverzeichnis
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Optional prüfen, ob Renew grundsätzlich funktioniert (ändert auf Produktion nichts am Zertifikat, wenn noch nicht fällig):

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

### HTTP-01 und Firewalls

- Port **80** muss von außen für `/.well-known/acme-challenge/` erreichbar sein (Redirect auf HTTPS ist ok, solange die Challenge-Location wie in `nginx.conf` ausgeliefert wird).
- Wenn Erneuerung fehlschlägt: Firewall, falsches DNS, oder anderer Dienst auf Port 80 prüfen.

### Domain- oder Zertifikatswechsel

1. Neue Zertifikate mit `certbot certonly … -d neue.domain …` ausstellen (Webroot wie bei Erstinstallation).
2. `nginx/nginx.conf` anpassen: `server_name`, `ssl_certificate`, `ssl_certificate_key`, Redirect-Ziele.
3. `docker compose -f docker-compose.prod.yml up -d` und `nginx` reload.

---

## Tagesbetrieb: Befehle

Arbeitsverzeichnis: Klon auf dem Server (z. B. `/opt/politikpraxis`).

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs (letzte Zeilen, follow)
docker compose -f docker-compose.prod.yml logs -f --tail=200 nginx
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
docker compose -f docker-compose.prod.yml logs -f --tail=100 certbot

# Konfiguration nach Änderung an nginx.conf
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Einzelnen Dienst neu starten
docker compose -f docker-compose.prod.yml restart backend
```

**Updates (Images neu bauen):** wie in [Deployment — Manuelles Deployment](deployment.md): `git pull`, `build`, `up -d --remove-orphans`. Datenbank-Migrationen laufen beim Backend-Start mit Alembic — vor größeren Releases ggf. Backup einplanen.

---

## Datenbank: Backup und Wiederherstellung (Kurz)

**Backup** (Beispiel Dump in Datei auf dem Host):

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner \
  | gzip > "backup-$(date +%F-%H%M).sql.gz"
```

(`POSTGRES_USER` / `POSTGRES_DB` aus der Server-`.env` setzen oder Werte einsetzen.)

**Restore** (nur mit Verstand, überschreibt Ziel-DB — vorher Snapshot/Backup der aktuellen DB):

```bash
gunzip -c backup-….sql.gz | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Produktions-Tipps: regelmäßige, getestete Backups; Aufbewahrung außerhalb des Servers.

---

## Fehlerbilder (Betrieb)

| Symptom | Mögliche Ursache | Maßnahme |
|---------|------------------|----------|
| Browser: Zertifikatfehler / nginx startet nicht | Keine LE-Dateien oder falscher Pfad/Name | Erstausstellung / Pfade in `nginx.conf` prüfen |
| 502 auf `/api/` oder SPA | `backend`/`frontend` down oder Netzwerk | `docker compose ps`, Logs `backend`/`nginx` |
| Renew schlägt fehl | Port 80, DNS, Rate-Limit | `certbot` Logs, `renew --dry-run`, externe Erreichbarkeit testen |
| Nach Deploy alte API | Browser-Cache / alter Container | Hard-Reload; prüfen ob neues Image läuft (`docker compose images`) |

Weitere Hinweise: [Deployment — Troubleshooting](deployment.md).

---

## Sicherheit und Geheimnisse

- `.env` auf dem Server **niemals** ins Repo committen; Rechte restriktiv (`chmod 600`).
- `SECRET_KEY`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, SMTP-Passwörter nur aus sicherer Quelle.
- Admin-API nur intern oder durch zusätzliche Schutzmaßnahmen absichern (siehe [Sicherheits-Review](../security-review.md)).
