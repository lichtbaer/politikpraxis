#!/bin/sh
set -eu

LOCKFILE="/app/package-lock.json"
HASH_FILE="/app/node_modules/.package-lock.hash"

if [ ! -f "$LOCKFILE" ]; then
  echo "package-lock.json fehlt, installiere Dependencies mit npm install..."
  npm install
else
  CURRENT_HASH="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
  SAVED_HASH=""

  if [ -f "$HASH_FILE" ]; then
    SAVED_HASH="$(cat "$HASH_FILE")"
  fi

  if [ ! -d "/app/node_modules" ] || [ "$CURRENT_HASH" != "$SAVED_HASH" ]; then
    echo "Dependencies sind veraltet oder fehlen, fuehre npm ci aus..."
    npm ci
    printf "%s" "$CURRENT_HASH" > "$HASH_FILE"
  fi
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
