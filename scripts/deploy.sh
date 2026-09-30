#!/usr/bin/env bash
# Production deploy for politikpraxis: fetch, validate, build, health-gate, rollback on failure.
# Invoked by .github/workflows/deploy.yml over SSH (or manually / via a forced-command SSH key).
# Usage: PP_ROOT=/opt/politikpraxis ./scripts/deploy.sh [<commit-sha>]
#
# Target commit, in order of precedence:
#   1. first argument (deploy.yml passes the commit lint.yml verified),
#   2. DEPLOY_SHA environment variable,
#   3. a 40-char SHA inside SSH_ORIGINAL_COMMAND (forced-command keys run this script
#      instead of the client's command, so the SHA only arrives that way),
#   4. otherwise the current origin/main (manual deploy).
# The target must be part of origin/main; the checkout only ever fast-forwards to it.
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

TARGET_SHA="${1:-${DEPLOY_SHA:-}}"
if [[ -z "$TARGET_SHA" && -n "${SSH_ORIGINAL_COMMAND:-}" ]]; then
  TARGET_SHA="$(grep -oE '\b[0-9a-f]{40}\b' <<<"$SSH_ORIGINAL_COMMAND" | tail -n 1 || true)"
fi
if [[ -n "$TARGET_SHA" && ! "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "error: invalid target commit '$TARGET_SHA' (expected a full 40-char SHA)" >&2
  exit 2
fi

PREVIOUS_SHA="$(git rev-parse HEAD)"
log "current commit before deploy: $PREVIOUS_SHA"

git fetch origin main
if [[ -z "$TARGET_SHA" ]]; then
  TARGET_SHA="$(git rev-parse origin/main)"
  log "no target commit given — deploying origin/main"
fi

# Only commits that landed on main are deployable (not a PR head, not a stray push).
if ! git merge-base --is-ancestor "$TARGET_SHA" origin/main; then
  echo "error: $TARGET_SHA is not part of origin/main — refusing to deploy" >&2
  exit 1
fi

# A queued run for an older commit must not roll the server back.
if [[ "$TARGET_SHA" != "$PREVIOUS_SHA" ]] && git merge-base --is-ancestor "$TARGET_SHA" "$PREVIOUS_SHA"; then
  log "$PREVIOUS_SHA already contains $TARGET_SHA — nothing to deploy"
  exit 0
fi

# Fast-forward only: fails loudly instead of merging if the server checkout diverged.
git merge --ff-only "$TARGET_SHA"
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
