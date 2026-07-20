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

Der übliche Name entspricht der **ersten** mit `certbot certonly … -d` angegebenen Domain (im Projektbeispiel: `politikpraxis.de` → Pfade wie `live/politikpraxis.de/`). Bei **eigener Domain** müssen `server_name`, `ssl_certificate` und `certbot -d` konsistent sein — siehe auch [Deployment — nginx: Sicherheit](../deployment.md).

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

Ergänzende Hinweise zu `.env`, CORS und Deploy-Pipeline: [Deployment (Produktion)](../deployment.md).

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

**Updates (Images neu bauen):** wie in [Deployment — Manuelles Deployment](../deployment.md): `git pull`, `build`, `up -d --remove-orphans`. Datenbank-Migrationen laufen beim Backend-Start mit Alembic — vor größeren Releases `scripts/backup/backup-db.sh` ausführen (siehe unten).

---

## Datenbank: Backup und Wiederherstellung

Ziel: bei Volume-Verlust (`pgdata`) oder Fehlbedienung einen **definierten Wiederherstellungsweg** haben. Geschützt werden u. a. User-Accounts, Cloud-Saves, Analytics/Stats und der in PostgreSQL gepflegte Content.

| Ebene | Ort | Aufbewahrung |
|-------|-----|--------------|
| Lokal (Host, **nicht** Docker-Volume) | `/var/backups/politikpraxis/` | **14 Tage** |
| Offsite (S3-kompatibel via rclone) | Remote `politikpraxis-backup:politikpraxis-db` | **30 Tage** |

Skripte liegen im Repo unter [`scripts/backup/`](https://github.com/lichtbaer/politikpraxis/tree/main/scripts/backup):

| Skript | Zweck |
|--------|--------|
| `backup-db.sh` | `pg_dump` → gzip, lokale Retention |
| `offsite-sync.sh` | rclone-Copy + Löschen älterer Remote-Dumps |
| `restore-db.sh` | Notfall-Restore in die Compose-DB |
| `verify-restore.sh` | Restore-Drill in einen **temporären** Postgres-Container |

### Erstsetup (einmalig auf dem Server)

```bash
# 1) Backup-Verzeichnis (außerhalb von Docker-Volumes)
sudo mkdir -p /var/backups/politikpraxis
sudo chown "$USER":"$USER" /var/backups/politikpraxis
chmod 750 /var/backups/politikpraxis

# 2) Skripte ausführbar (nach git pull)
chmod +x /opt/politikpraxis/scripts/backup/*.sh

# 3) Manueller Probelauf
PP_ROOT=/opt/politikpraxis /opt/politikpraxis/scripts/backup/backup-db.sh
```

**Offsite (rclone):** auf dem Host `rclone` installieren und ein S3-kompatibles Remote anlegen (Hetzner Object Storage, MinIO, AWS S3, …):

```bash
rclone config   # Remote-Name z. B. politikpraxis-backup, Typ s3 / Other
# Optional: Bucket-Lifecycle-Regel im Anbieter-UI auf 30 Tage setzen (zusätzlich zum Skript)
```

Umgebungsvariablen (optional, Defaults in Klammern):

| Variable | Default | Bedeutung |
|----------|---------|-----------|
| `PP_ROOT` | `/opt/politikpraxis` | Projektverzeichnis mit `docker-compose.prod.yml` und `.env` |
| `BACKUP_DIR` | `/var/backups/politikpraxis` | Lokales Dump-Verzeichnis |
| `RETENTION_DAYS` | `14` | Lokale Aufbewahrung |
| `RCLONE_REMOTE` | `politikpraxis-backup:politikpraxis-db` | Zielpfad für Offsite |
| `OFFSITE_MAX_AGE` | `30d` | Remote-Dateien älter als dieser Wert werden gelöscht |

rclone-Credentials gehören in `~/.config/rclone/rclone.conf` auf dem Server — **nicht** ins Git-Repo.

### Cron (täglich)

Als User, der Docker und das Projektverzeichnis nutzen darf (z. B. `deploy`):

```cron
15 3 * * * PP_ROOT=/opt/politikpraxis /opt/politikpraxis/scripts/backup/backup-db.sh >> /var/log/politikpraxis-backup.log 2>&1
30 3 * * * PP_ROOT=/opt/politikpraxis /opt/politikpraxis/scripts/backup/offsite-sync.sh >> /var/log/politikpraxis-backup.log 2>&1
```

Log-Datei anlegen und Rechte setzen, z. B. `sudo touch /var/log/politikpraxis-backup.log && sudo chown deploy:deploy /var/log/politikpraxis-backup.log`. Cron-Ausgabe regelmäßig prüfen.

### Notfall-Restore (Produktion)

1. Stack läuft (`db` healthy).
2. Dump wählen (lokal oder per `rclone copy` vom Offsite-Remote holen).
3. Restore nur bewusst:

```bash
# überschreibt die Produktions-DB — vorher RESTORE_CONFIRM setzen
PP_ROOT=/opt/politikpraxis RESTORE_CONFIRM=yes \
  /opt/politikpraxis/scripts/backup/restore-db.sh \
  /var/backups/politikpraxis/politikpraxis-YYYY-MM-DDTHHMM.sql.gz
```

Das Skript legt standardmäßig zuerst ein Safety-Dump an (`SKIP_SAFETY_DUMP=1` zum Überspringen). Danach Backend neu starten und Alembic-Stand prüfen:

```bash
cd /opt/politikpraxis
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml exec backend alembic current
```

### Quartals-Verifikation (ohne Prod anzufassen)

```bash
PP_ROOT=/opt/politikpraxis /opt/politikpraxis/scripts/backup/verify-restore.sh
# oder explizit:
PP_ROOT=/opt/politikpraxis /opt/politikpraxis/scripts/backup/verify-restore.sh \
  /var/backups/politikpraxis/politikpraxis-….sql.gz
```

Erwartung: temporärer Container lädt den Dump; Smoke-Checks auf `alembic_version` (und ggf. `users`/`saves`) sind grün. Ergebnis im Betriebs-Log / Ticket vermerken.

### Vor größeren Releases

Vor riskanten Migrationen oder Content-Importen einmal manuell `backup-db.sh` (und idealerweise `offsite-sync.sh`) ausführen.

### Manuell (Einzeiler, ohne Skripte)

Nur falls die Skripte nicht verfügbar sind — Credentials aus der Server-`.env`:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "/var/backups/politikpraxis/backup-$(date -u +%Y-%m-%dT%H%M).sql.gz"
```

---

## Fehlerbilder (Betrieb)

| Symptom | Mögliche Ursache | Maßnahme |
|---------|------------------|----------|
| Browser: Zertifikatfehler / nginx startet nicht | Keine LE-Dateien oder falscher Pfad/Name | Erstausstellung / Pfade in `nginx.conf` prüfen |
| 502 auf `/api/` oder SPA | `backend`/`frontend` down oder Netzwerk | `docker compose ps`, Logs `backend`/`nginx` |
| Renew schlägt fehl | Port 80, DNS, Rate-Limit | `certbot` Logs, `renew --dry-run`, externe Erreichbarkeit testen |
| Nach Deploy alte API | Browser-Cache / alter Container | Hard-Reload; prüfen ob neues Image läuft (`docker compose images`) |

Weitere Hinweise: [Deployment — Troubleshooting](../deployment.md).

---

## Sicherheit und Geheimnisse

- `.env` auf dem Server **niemals** ins Repo committen; Rechte restriktiv (`chmod 600`).
- `SECRET_KEY`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, SMTP-Passwörter nur aus sicherer Quelle.
- Admin-API nur intern oder durch zusätzliche Schutzmaßnahmen absichern (siehe [Sicherheits-Review](../security-review.md)).
- **Rate-Limits (Auth/Admin/slowapi):** Schlüssel ist die Client-IP aus `X-Real-IP` (setzt nginx aus `$remote_addr`, siehe `nginx/nginx.conf`) — nicht die IP des nginx-Containers. So greifen Limits pro echtem Client hinter dem Reverse-Proxy.
- **Per-Worker-Limits:** Das Backend startet in Produktion mit `--workers 2` ([`Dockerfile.prod`](https://github.com/lichtbaer/politikpraxis/blob/main/backend/Dockerfile.prod)). In-Memory-Buckets (slowapi, Admin-Sliding-Window, Kontakt-Limiter) gelten **pro Worker**; die effektiven Limits können sich dadurch annähernd verdoppeln. Geteilter Storage (z. B. Redis) ist Issue #231.
