#!/usr/bin/env bash
# Daily PostgreSQL dump for politikpraxis production.
# Usage: PP_ROOT=/opt/politikpraxis ./scripts/backup/backup-db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR" 2>/dev/null || true

cd "$PP_ROOT"
require_compose_db
resolve_postgres_identity

STAMP="$(date -u +'%Y-%m-%dT%H%M')"
OUT="$BACKUP_DIR/politikpraxis-${STAMP}.sql.gz"
TMP="${OUT}.partial"

log "starting backup → $OUT (db=$POSTGRES_DB user=$POSTGRES_USER)"

# pg_dump exit status must propagate through the pipe (bash pipefail).
"${COMPOSE[@]}" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip -c >"$TMP"

if [[ ! -s "$TMP" ]]; then
  rm -f "$TMP"
  echo "error: backup file empty or missing: $TMP" >&2
  exit 1
fi

mv -f "$TMP" "$OUT"
BYTES="$(wc -c <"$OUT" | tr -d ' ')"
log "backup complete: $OUT ($BYTES bytes)"

# Retention: remove dumps older than RETENTION_DAYS.
DELETED=0
while IFS= read -r -d '' old; do
  rm -f "$old"
  DELETED=$((DELETED + 1))
  log "pruned $old"
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'politikpraxis-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null || true)

log "retention: kept dumps newer than ${RETENTION_DAYS}d (pruned $DELETED)"
log "done"
