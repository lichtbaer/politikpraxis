#!/usr/bin/env bash
# Verify that a dump restores cleanly into a temporary Postgres container
# (does not touch production). Intended for quarterly restore drills.
#
# Usage:
#   ./scripts/backup/verify-restore.sh /var/backups/politikpraxis/politikpraxis-….sql.gz
#   ./scripts/backup/verify-restore.sh   # uses newest dump in BACKUP_DIR
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

DUMP_PATH="${1:-}"
if [[ -z "$DUMP_PATH" ]]; then
  DUMP_PATH="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'politikpraxis-*.sql.gz' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr | head -n1 | cut -d' ' -f2- || true)"
fi
if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  echo "usage: $0 [path-to-politikpraxis-….sql.gz]" >&2
  echo "error: no dump found (BACKUP_DIR=$BACKUP_DIR)" >&2
  exit 1
fi

CONTAINER="pp-backup-verify-$$"
PGUSER="${VERIFY_PGUSER:-postgres}"
PGDB="${VERIFY_PGDB:-politikpraxis}"
PGPASSWORD="${VERIFY_PGPASSWORD:-verify}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "verify-restore: starting temp postgres ($CONTAINER)"
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER="$PGUSER" \
  -e POSTGRES_PASSWORD="$PGPASSWORD" \
  -e POSTGRES_DB="$PGDB" \
  postgres:16-alpine >/dev/null

# Wait until ready.
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker exec "$CONTAINER" pg_isready -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; then
  echo "error: temp postgres did not become ready" >&2
  exit 1
fi

log "loading dump $DUMP_PATH"
gunzip -c "$DUMP_PATH" | docker exec -i "$CONTAINER" \
  psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 >/dev/null

log "smoke queries"
# alembic_version should exist after a real app dump; tolerate missing with a clear message.
if docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDB" -tAc \
  "SELECT to_regclass('public.alembic_version') IS NOT NULL;" | grep -qx t; then
  REV="$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDB" -tAc 'SELECT version_num FROM alembic_version LIMIT 1;' | tr -d '[:space:]')"
  log "alembic_version OK (revision=$REV)"
else
  echo "error: table alembic_version missing after restore — dump may be incomplete" >&2
  exit 1
fi

# Optional presence checks (non-fatal if table missing in older dumps).
for table in users saves; do
  if docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDB" -tAc \
    "SELECT to_regclass('public.${table}') IS NOT NULL;" | grep -qx t; then
    COUNT="$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDB" -tAc "SELECT count(*) FROM ${table};" | tr -d '[:space:]')"
    log "table $table: $COUNT rows"
  else
    log "table $table: not present (skipped)"
  fi
done

log "verify-restore PASSED for $DUMP_PATH"
