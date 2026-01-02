#!/bin/bash
set -e

echo "========================================"
echo "Celery Container Initialization"
echo "========================================"

# Validate required environment variable
if [ -z "$PROMETHEUS_MULTIPROC_DIR" ]; then
    echo "ERROR: PROMETHEUS_MULTIPROC_DIR environment variable is not set"
    echo "This is required for multiprocess metrics collection"
    exit 1
fi

echo "Metrics directory: $PROMETHEUS_MULTIPROC_DIR"

# Ensure metrics directory exists and is clean
echo "Preparing Prometheus multiprocess directory..."
mkdir -p "$PROMETHEUS_MULTIPROC_DIR"

# Count and remove stale metric files
STALE_COUNT=$(find "$PROMETHEUS_MULTIPROC_DIR" -name "*.db" 2>/dev/null | wc -l)
if [ "$STALE_COUNT" -gt 0 ]; then
    echo "Removing $STALE_COUNT stale metric file(s)"
    rm -f "$PROMETHEUS_MULTIPROC_DIR"/*.db
else
    echo "No stale metric files found"
fi

echo "Directory prepared: $PROMETHEUS_MULTIPROC_DIR"
echo "========================================"
echo "Starting: $@"
echo "========================================"

# Execute the command
exec "$@"
