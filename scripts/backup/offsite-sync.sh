#!/usr/bin/env bash
# Sync local DB dumps to an S3-compatible rclone remote (offsite).
# Requires: rclone installed and remote configured (see docs).
# Usage: PP_ROOT=/opt/politikpraxis ./scripts/backup/offsite-sync.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

if ! command -v rclone >/dev/null 2>&1; then
  echo "error: rclone not found in PATH — install rclone and configure the remote before enabling offsite sync" >&2
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "error: BACKUP_DIR does not exist: $BACKUP_DIR (run backup-db.sh first)" >&2
  exit 1
fi

DUMP_COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'politikpraxis-*.sql.gz' 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$DUMP_COUNT" -eq 0 ]]; then
  echo "error: no dumps in $BACKUP_DIR — nothing to sync" >&2
  exit 1
fi

# Fail loudly if remote is missing / misconfigured.
if ! rclone lsd "${RCLONE_REMOTE%%:*}:" >/dev/null 2>&1; then
  echo "error: rclone remote '${RCLONE_REMOTE%%:*}' is not configured or unreachable" >&2
  echo "hint: rclone config  → create S3-compatible remote, set RCLONE_REMOTE=$RCLONE_REMOTE" >&2
  exit 1
fi

log "offsite sync: $BACKUP_DIR → $RCLONE_REMOTE (max-age local copy; remote retention via bucket lifecycle or delete)"

# Copy new/changed dumps to remote. --immutable avoids overwriting existing remote objects.
rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" \
  --include 'politikpraxis-*.sql.gz' \
  --immutable \
  --checksum \
  --log-level INFO

# Remove remote objects older than OFFSITE_MAX_AGE (default 30d).
# Uses rclone delete with --min-age so only aged dumps are removed.
rclone delete "$RCLONE_REMOTE" \
  --include 'politikpraxis-*.sql.gz' \
  --min-age "$OFFSITE_MAX_AGE" \
  --rmdirs \
  --log-level INFO

log "offsite sync done"
