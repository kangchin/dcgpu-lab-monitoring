#!/usr/bin/env bash
set -euo pipefail

# Prepare PROMETHEUS multiprocess directory if configured
PROMETHEUS_MULTIPROC_DIR="${PROMETHEUS_MULTIPROC_DIR:-}"
WORKER_METRICS_PORT="${WORKER_METRICS_PORT:-9200}"

if [ -n "$PROMETHEUS_MULTIPROC_DIR" ]; then
  mkdir -p "$PROMETHEUS_MULTIPROC_DIR"
  # Remove stale files
  rm -f "$PROMETHEUS_MULTIPROC_DIR"/* || true
  echo "Prepared PROMETHEUS_MULTIPROC_DIR=$PROMETHEUS_MULTIPROC_DIR"
fi

# If first arg is 'metrics-server', run the metrics server
if [ "$1" = "metrics-server" ]; then
  shift
  exec python3 /app/celery/metrics_server.py "$@"
fi

# Default: run provided command
exec "$@"
