#!/usr/bin/env bash
# Shared defaults for politikpraxis DB backup scripts.
# Sourced by backup-db.sh, offsite-sync.sh, restore-db.sh, verify-restore.sh.

: "${PP_ROOT:=/opt/politikpraxis}"
: "${BACKUP_DIR:=/var/backups/politikpraxis}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${RETENTION_DAYS:=14}"
: "${RCLONE_REMOTE:=politikpraxis-backup:politikpraxis-db}"
: "${OFFSITE_MAX_AGE:=30d}"

COMPOSE=(docker compose -f "$PP_ROOT/$COMPOSE_FILE")

# Load KEY=value from project .env (first match). Strips optional surrounding quotes.
_load_env_var() {
  local key="$1"
  local file="$PP_ROOT/.env"
  local line value
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  line="$(grep -E "^${key}=" "$file" | head -n1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

# Resolve POSTGRES_USER / POSTGRES_DB from env, .env, or running db container.
resolve_postgres_identity() {
  if [[ -z "${POSTGRES_USER:-}" ]]; then
    POSTGRES_USER="$(_load_env_var POSTGRES_USER || true)"
  fi
  if [[ -z "${POSTGRES_DB:-}" ]]; then
    POSTGRES_DB="$(_load_env_var POSTGRES_DB || true)"
  fi
  if [[ -z "${POSTGRES_USER:-}" ]]; then
    POSTGRES_USER="$("${COMPOSE[@]}" exec -T db printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || true)"
  fi
  if [[ -z "${POSTGRES_DB:-}" ]]; then
    POSTGRES_DB="$("${COMPOSE[@]}" exec -T db printenv POSTGRES_DB 2>/dev/null | tr -d '\r' || true)"
  fi
  if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_DB:-}" ]]; then
    echo "error: POSTGRES_USER and POSTGRES_DB must be set (env, $PP_ROOT/.env, or running db service)" >&2
    return 1
  fi
  export POSTGRES_USER POSTGRES_DB
}

require_compose_db() {
  if ! "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx db; then
    # Fallback for older compose: check via docker compose ps
    if ! "${COMPOSE[@]}" exec -T db true 2>/dev/null; then
      echo "error: Compose service 'db' is not reachable (PP_ROOT=$PP_ROOT, file=$COMPOSE_FILE)" >&2
      return 1
    fi
  fi
}

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}
