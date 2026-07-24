# Datenbank-Migrationen (Alembic)

Konventionen für neue Alembic-Revisionen in `backend/app/db/migrations/versions/`, damit die Historie nachvollziehbar bleibt und parallele Heads nicht mehr die Regel sind.

## Hintergrund

Die Historie enthielt über weite Strecken mehrere Migrationsdateien mit derselben numerischen Revisions-ID (`029_*`, `031_*`, `032_*`, `035_*`, `036_*`, `040_*`) sowie viele `merge_*_heads`-Migrationen. Ursache: Mehrere parallele Branches/PRs haben jeweils die zum Erstellungszeitpunkt aktuelle `down_revision` verwendet, ohne vor dem Merge zu rebasen — beim Zusammenführen entstanden dadurch wiederholt divergierende Köpfe (Alembic-"Heads"), die per Merge-Migration wieder zusammengeführt werden mussten.

## Konvention für neue Revisionen

1. **Vor dem Erstellen einer Migration:** `git pull`/rebase auf den aktuellen `main`-Stand, damit `alembic heads` (siehe unten) nur einen einzigen Head zeigt, bevor eine neue Revision angelegt wird.
2. **Revisions-ID:** dreistellige, fortlaufende Nummer als Präfix (`062_`, `063_`, …) + kurzer, sprechender Slug, z. B. `062_ticket_beispiel`. Ticket-/Issue-Referenz optional im Slug oder im Docstring, nicht in der Nummer.
3. **`down_revision`:** immer auf den aktuellen (einzigen) Head zeigen lassen — nicht auf eine ältere Revision, "damit man den eigenen Branch nicht rebasen muss". Wer während der Entwicklung merkt, dass zwischenzeitlich eine andere Migration auf `main` gelandet ist, aktualisiert `down_revision` in der eigenen, noch unveröffentlichten Migration (`alembic revision --autogenerate` neu laufen lassen bzw. die Datei manuell anpassen) statt eine Merge-Migration zu erzeugen.
4. **Merge-Migrationen** (`alembic merge heads`) sind die Ausnahme, kein Standard-Workflow-Schritt. Sie sind nur dann akzeptabel, wenn zwei bereits auf `main` gemergte PRs unabhängig voneinander neue Heads erzeugt haben und ein nachträgliches Rebase der bereits deployten Revisionen nicht mehr infrage kommt (siehe unten). Ein neuer PR sollte fast nie eine Merge-Migration enthalten müssen, wenn Punkt 1 befolgt wird.
5. **Bereits deployte Revisionen** (alles, was in `main` gemerged ist) werden **nicht** nachträglich umbenannt oder umgehängt — Produktions-DBs verweisen per `alembic_version`-Tabelle auf die existierenden IDs.

## CI-Check: nur ein Head erlaubt

Der `alembic-migrations`-Job in [`.github/workflows/lint.yml`](https://github.com/lichtbaer/politikpraxis/blob/main/.github/workflows/lint.yml) prüft bei jedem Push/PR:

- `alembic heads` liefert **genau einen** Head. Zeigt der Befehl mehr als eine Zeile, schlägt der Job fehl — ein PR mit divergierenden Heads kann so nicht nach `main` gemergt werden, ohne dass vorher rebased oder eine bewusste Merge-Migration ergänzt wird.
- `alembic upgrade head` läuft gegen eine leere Postgres-Testdatenbank vollständig und ohne Fehler durch — das stellt sicher, dass die komplette Historie (von Revision `001` bis zum aktuellen Head) weiterhin anwendbar ist.

## Lokal prüfen

```bash
cd backend
export DEBUG=1 DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/<leere_test_db>"
alembic heads          # muss genau eine Zeile ausgeben
alembic upgrade head   # muss ohne Fehler durchlaufen
```
