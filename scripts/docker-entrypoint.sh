#!/usr/bin/env bash
# Production entrypoint: Next.js web + cron scheduler in one container.
set -euo pipefail

SCHEDULER_PID=""
WEB_PID=""

shutdown() {
  echo "[entrypoint] Shutting down..."
  if [[ -n "${WEB_PID}" ]] && kill -0 "${WEB_PID}" 2>/dev/null; then
    kill -TERM "${WEB_PID}" 2>/dev/null || true
  fi
  if [[ -n "${SCHEDULER_PID}" ]] && kill -0 "${SCHEDULER_PID}" 2>/dev/null; then
    kill -TERM "${SCHEDULER_PID}" 2>/dev/null || true
  fi
  wait || true
  echo "[entrypoint] Stopped."
  exit 0
}

trap shutdown SIGTERM SIGINT

echo "[entrypoint] Starting scheduler..."
npm run scheduler:prod &
SCHEDULER_PID=$!
echo "[entrypoint] Scheduler pid=${SCHEDULER_PID}"

echo "[entrypoint] Starting Next.js web on :${PORT:-3000}..."
npm run start &
WEB_PID=$!
echo "[entrypoint] Web pid=${WEB_PID}"

# Wait for either process to exit; then shut both down.
wait -n "${WEB_PID}" "${SCHEDULER_PID}" || true
EXIT_CODE=$?

if ! kill -0 "${WEB_PID}" 2>/dev/null; then
  echo "[entrypoint] Web process exited (code=${EXIT_CODE})."
elif ! kill -0 "${SCHEDULER_PID}" 2>/dev/null; then
  echo "[entrypoint] Scheduler process exited (code=${EXIT_CODE})."
fi

shutdown
