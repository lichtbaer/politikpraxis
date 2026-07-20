#!/usr/bin/env bash
# Restore a gzipped pg_dump into the Compose production database.
# DANGER: overwrites the target database contents.
#
# Usage:
#   RESTORE_CONFIRM=yes ./scripts/backup/restore-db.sh /var/backups/politikpraxis/politikpraxis-….sql.gz
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

DUMP_PATH="${1:-}"
if [[ -z "$DUMP_PATH" ]]; then
  echo "usage: RESTORE_CONFIRM=yes $0 <path-to-politikpraxis-….sql.gz>" >&2
  exit 1
fi
if [[ ! -f "$DUMP_PATH" ]]; then
  echo "error: dump not found: $DUMP_PATH" >&2
  exit 1
fi
if [[ "$DUMP_PATH" != *.sql.gz ]]; then
  echo "error: expected a .sql.gz dump file" >&2
  exit 1
fi

cd "$PP_ROOT"
require_compose_db
resolve_postgres_identity

if [[ "${RESTORE_CONFIRM:-}" != "yes" ]]; then
  echo "This will OVERWRITE database '$POSTGRES_DB' on the Compose stack at $PP_ROOT." >&2
  echo "Re-run with RESTORE_CONFIRM=yes to proceed." >&2
  echo "Tip: take a safety dump first: $SCRIPT_DIR/backup-db.sh" >&2
  exit 1
fi

# Safety dump of current DB before restore (unless SKIP_SAFETY_DUMP=1).
if [[ "${SKIP_SAFETY_DUMP:-}" != "1" ]]; then
  log "taking safety dump before restore…"
  "$SCRIPT_DIR/backup-db.sh"
fi

log "restoring $DUMP_PATH → db=$POSTGRES_DB"
gunzip -c "$DUMP_PATH" | "${COMPOSE[@]}" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

log "restore finished"
log "next: restart backend so connections refresh — docker compose -f $COMPOSE_FILE restart backend"
log "verify Alembic: docker compose -f $COMPOSE_FILE exec backend alembic current"
