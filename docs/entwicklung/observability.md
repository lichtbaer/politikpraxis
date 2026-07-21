# Observability: Error-Tracking, Logs, Monitoring

Wie Produktionsfehler heute sichtbar gemacht werden, und wie sie überwacht/alarmiert werden. Für Wartungsaufgaben am Docker-Stack selbst siehe [Produktivbetrieb mit Docker](produktivbetrieb-docker.md).

---

## Error-Tracking (Sentry)

Backend und Frontend integrieren [Sentry](https://sentry.io) optional — ohne gesetzte DSN ist die Integration ein No-Op, es entstehen keine externen Requests.

| | Backend | Frontend |
|---|---|---|
| Env-Variable | `SENTRY_DSN` | `VITE_SENTRY_DSN` |
| Environment-Tag | `SENTRY_ENVIRONMENT` (Default `development`) | `VITE_SENTRY_ENVIRONMENT` (Default: Vite-Mode) |
| Init-Code | `backend/app/observability.py::configure_sentry` (aufgerufen in `app/main.py` beim Start) | `frontend/src/services/sentry.ts::initSentry` (aufgerufen in `main.tsx` vor dem Render) |
| Fängt | Unbehandelte Exceptions in Routen/Services, `ERROR`-Logs via `LoggingIntegration` | Unbehandelte React-Render-Fehler (`Sentry.ErrorBoundary` um `<App />`), unbehandelte JS-Fehler |

**Setup in Produktion:**

1. Sentry-Projekt anlegen (eins für Backend, eins für Frontend, oder ein gemeinsames — je nach Team-Präferenz).
2. `SENTRY_DSN` und `SENTRY_ENVIRONMENT=production` in der Server-`.env` setzen (siehe `backend/.env.example`).
3. `VITE_SENTRY_DSN` und `VITE_SENTRY_ENVIRONMENT=production` als Build-Arg für den Frontend-Build setzen (siehe `frontend/.env.example`) — landet im Browser-Bundle, ist also kein Secret.
4. Alerts in Sentry einrichten (siehe unten).

`send_default_pii`/`sendDefaultPii` ist bewusst **deaktiviert** — es werden keine Nutzer-IPs/-Header automatisch mitgeschickt. `SENTRY_TRACES_SAMPLE_RATE` steuert Performance-Tracing (Default `0.0` = aus).

---

## Strukturierte Logs (Backend)

`backend/app/observability.py::configure_logging` konfiguriert das Root-Logging beim Start:

- **Produktion (`DEBUG=false`):** JSON-Logs über `python-json-logger`, ein JSON-Objekt pro Zeile (`timestamp`, `level`, `name`, `message`, plus über `extra=` übergebene Felder). Damit sind Logs direkt in Log-Aggregatoren (z. B. `docker logs` → `jq`, Loki, CloudWatch) auswertbar.
- **Entwicklung (`DEBUG=true`):** Klartext-Format wie bisher (`%(asctime)s %(levelname)s %(name)s %(message)s`).
- Override möglich über `LOG_JSON=true`/`false`, unabhängig von `DEBUG`.

Die bestehende Request-Logging-Middleware (`backend/app/main.py`, Methode/Pfad/Status/Dauer je Request) profitiert davon automatisch — im Prod-Modus erscheint jede Zeile als JSON.

Logs auf dem Server einsehen: `docker compose -f docker-compose.prod.yml logs -f backend`.

---

## Health/Readiness

`GET /api/health` (`backend/app/main.py`) ist der bestehende Health-Endpoint (`{"status": "ok", "version": "..."}`), unauthentifiziert, ohne DB-Zugriff. Er dient als:

- **Uptime-Check:** Externer Monitor (z. B. UptimeRobot, Better Uptime, ein einfacher Cron mit `curl -f`) sollte periodisch gegen diesen Endpoint prüfen und bei Nicht-200 alarmieren.
- **Deploy-Gate:** siehe geplantes Post-Deploy-Healthcheck-Gating in der CI (separates Ticket).

Ein dedizierter `/metrics`-Endpoint (Prometheus) ist bewusst **nicht** Teil dieses Passes — für die aktuelle Betriebsgröße reichen Sentry (Fehler) + `/api/health` (Verfügbarkeit) + Log-Aggregation (Kontext) aus. Falls Request-Raten/Latenz-Dashboards nötig werden, ist `prometheus-fastapi-instrumentator` der naheliegende nächste Schritt.

---

## Alerting

- **Sentry:** In den Projekteinstellungen unter *Alerts* eine Regel „Bei neuem Issue benachrichtigen" (E-Mail/Slack) sowie „Bei Häufung (z. B. > N Events / 5 Min)" einrichten. Damit werden sowohl neue Fehlerklassen als auch Fehler-Spitzen gemeldet.
- **Uptime:** Externer Uptime-Monitor auf `/api/health` mit E-Mail/Slack-Alert bei Ausfall.
- **Logs:** Ohne zentrale Log-Aggregation bleibt `docker compose logs` der primäre Weg, um Kontext zu einem Sentry-Issue nachzuschlagen (Zeitstempel aus Sentry als Filter nutzen).

Diese drei Kanäle (Sentry für Fehler, Uptime-Check für Verfügbarkeit, Container-Logs für Kontext) sind der aktuelle Mindeststandard für den Produktivbetrieb.
