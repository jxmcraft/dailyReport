#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set." >&2
  exit 1
fi

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: bash scripts/migrate.sh <migration-name>" >&2
  exit 1
fi

npx prisma migrate dev --name "$NAME"
