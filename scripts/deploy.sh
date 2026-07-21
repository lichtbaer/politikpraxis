#!/usr/bin/env bash
# Production deploy for politikpraxis: pull, validate, build, health-gate, rollback on failure.
# Invoked by .github/workflows/deploy.yml over SSH (or manually / via a forced-command SSH key).
# Usage: PP_ROOT=/opt/politikpraxis ./scripts/deploy.sh
set -euo pipefail

: "${PP_ROOT:=/opt/politikpraxis}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${HEALTH_RETRIES:=10}"
: "${HEALTH_DELAY:=3}"

COMPOSE=(docker compose -f "$PP_ROOT/$COMPOSE_FILE")

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

cd "$PP_ROOT"

PREVIOUS_SHA="$(git rev-parse HEAD)"
log "current commit before deploy: $PREVIOUS_SHA"

git pull origin main
CURRENT_SHA="$(git rev-parse HEAD)"
log "deploying $CURRENT_SHA"

log "validating compose config"
if ! "${COMPOSE[@]}" config >/dev/null; then
  echo "error: docker compose config invalid — aborting before touching running containers" >&2
  exit 1
fi

check_health() {
  "${COMPOSE[@]}" exec -T backend python -c \
    "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=5).status == 200 else 1)" \
    >/dev/null 2>&1
}

wait_for_health() {
  local attempt=1
  while (( attempt <= HEALTH_RETRIES )); do
    if check_health; then
      log "health check passed (attempt $attempt/$HEALTH_RETRIES)"
      return 0
    fi
    log "health check failed (attempt $attempt/$HEALTH_RETRIES)"
    sleep "$HEALTH_DELAY"
    attempt=$((attempt + 1))
  done
  return 1
}

log "building images"
"${COMPOSE[@]}" build

log "starting services"
"${COMPOSE[@]}" up -d --remove-orphans

if wait_for_health; then
  log "deploy successful: $CURRENT_SHA is healthy"
  docker system prune -f
  exit 0
fi

echo "error: post-deploy health check failed for $CURRENT_SHA" >&2

if [[ "$PREVIOUS_SHA" == "$CURRENT_SHA" ]]; then
  echo "error: no previous commit to roll back to — leaving broken deploy for manual investigation" >&2
  exit 1
fi

log "rolling back to $PREVIOUS_SHA"
git reset --hard "$PREVIOUS_SHA"
"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d --remove-orphans

if wait_for_health; then
  log "rollback successful: $PREVIOUS_SHA is healthy again"
else
  echo "error: rollback to $PREVIOUS_SHA also failed health check — manual intervention required" >&2
fi

# Deploy of $CURRENT_SHA failed regardless of rollback outcome — surface it as a failed CI run.
exit 1
