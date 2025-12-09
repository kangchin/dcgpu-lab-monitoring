#!/bin/bash

#########################################
# Celery Deployment Script for Podman
# RHEL 8.10 - Development Server
#########################################

set -e  # Exit on any error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Celery Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Load environment variables from celery/.env
if [ ! -f "celery/.env" ]; then
    echo -e "${RED}ERROR: celery/.env file not found!${NC}"
    echo "Please create celery/.env with required variables:"
    echo "  - CELERY_BROKER_URL"
    echo "  - CELERY_RESULT_BACKEND"
    echo "  - MONGODB_URL"
    echo "  - PROMETHEUS_MULTIPROC_DIR=/metrics"
    exit 1
fi

echo -e "${YELLOW}Loading environment variables from celery/.env${NC}"
set -a
source celery/.env
set +a

# Verify required environment variables
REQUIRED_VARS=("CELERY_BROKER_URL" "CELERY_RESULT_BACKEND" "MONGODB_URL" "PROMETHEUS_MULTIPROC_DIR")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}ERROR: Required environment variable $var is not set in celery/.env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Check prerequisites: dev_mongodb and dev_redis must be running
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! podman ps --format "{{.Names}}" | grep -q "^dev_mongodb$"; then
    echo -e "${RED}ERROR: Container 'dev_mongodb' is not running!${NC}"
    echo "Please start MongoDB container first:"
    echo "  podman run -d --name dev_mongodb -p 27017:27017 \\"
    echo "    -v ~/mongo-data:/data/db \\"
    echo "    -e MONGO_INITDB_ROOT_USERNAME=admin \\"
    echo "    -e MONGO_INITDB_ROOT_PASSWORD=amd12345 \\"
    echo "    mongo:latest"
    exit 1
fi
echo -e "${GREEN}✓ dev_mongodb is running${NC}"

if ! podman ps --format "{{.Names}}" | grep -q "^dev_redis$"; then
    echo -e "${RED}ERROR: Container 'dev_redis' is not running!${NC}"
    echo "Please start Redis container first:"
    echo "  podman run -d --name dev_redis -p 6379:6379 \\"
    echo "    -v ~/redis-data:/data \\"
    echo "    redis:latest redis-server --requirepass amd12345"
    exit 1
fi
echo -e "${GREEN}✓ dev_redis is running${NC}"

# Verify volume mounts for existing containers
echo -e "${YELLOW}Verifying volume mounts...${NC}"

MONGO_VOLUME=$(podman inspect dev_mongodb --format '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Source}}{{end}}{{end}}')
if [[ "$MONGO_VOLUME" != *"mongo-data"* ]]; then
    echo -e "${YELLOW}WARNING: dev_mongodb volume mount is '$MONGO_VOLUME', expected ~/mongo-data${NC}"
fi

REDIS_VOLUME=$(podman inspect dev_redis --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')
if [[ "$REDIS_VOLUME" != *"redis-data"* ]]; then
    echo -e "${YELLOW}WARNING: dev_redis volume mount is '$REDIS_VOLUME', expected ~/redis-data${NC}"
fi

echo -e "${GREEN}✓ Volume verification complete${NC}"

# Create metrics directory volume
echo -e "${YELLOW}Creating metrics directory volume...${NC}"
if ! podman volume inspect metrics_dir &>/dev/null; then
    podman volume create metrics_dir
    echo -e "${GREEN}✓ Created metrics_dir volume${NC}"
else
    echo -e "${GREEN}✓ metrics_dir volume already exists${NC}"
fi

# Clean up old containers if they exist
echo -e "${YELLOW}Cleaning up old containers...${NC}"
for container in celery celery-metrics; do
    if podman ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        echo "  Stopping and removing ${container}..."
        podman stop ${container} 2>/dev/null || true
        podman rm ${container} 2>/dev/null || true
    fi
done
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Build the Celery image
echo -e "${YELLOW}Building Celery Docker image...${NC}"
cd celery
podman build -t dcgpu-celery:latest .
cd ..
echo -e "${GREEN}✓ Image built successfully${NC}"

# Start Celery worker container
echo -e "${YELLOW}Starting Celery worker container...${NC}"
podman run -d \
    --name celery \
    --network host \
    -v metrics_dir:/metrics \
    -v $(pwd)/celery:/app \
    -v /etc/localtime:/etc/localtime:ro \
    -e CELERY_BROKER_URL="${CELERY_BROKER_URL}" \
    -e CELERY_RESULT_BACKEND="${CELERY_RESULT_BACKEND}" \
    -e MONGODB_URL="${MONGODB_URL}" \
    -e PROMETHEUS_MULTIPROC_DIR="${PROMETHEUS_MULTIPROC_DIR}" \
    dcgpu-celery:latest

echo -e "${GREEN}✓ Celery worker started${NC}"

# Start Celery metrics server container
echo -e "${YELLOW}Starting Celery metrics server...${NC}"
podman run -d \
    --name celery-metrics \
    --network host \
    -v metrics_dir:/metrics:ro \
    -v /etc/localtime:/etc/localtime:ro \
    -e PROMETHEUS_MULTIPROC_DIR=/metrics \
    dcgpu-celery:latest \
    python /app/metrics_server.py

echo -e "${GREEN}✓ Celery metrics server started${NC}"

# Wait a bit for containers to start
echo -e "${YELLOW}Waiting for containers to start...${NC}"
sleep 5

# Health checks
echo -e "${YELLOW}Performing health checks...${NC}"

# Check if containers are running
if ! podman ps --format "{{.Names}}" | grep -q "^celery$"; then
    echo -e "${RED}ERROR: Celery worker container is not running${NC}"
    echo "Check logs: podman logs celery"
    exit 1
fi
echo -e "${GREEN}✓ Celery worker is running${NC}"

if ! podman ps --format "{{.Names}}" | grep -q "^celery-metrics$"; then
    echo -e "${RED}ERROR: Celery metrics container is not running${NC}"
    echo "Check logs: podman logs celery-metrics"
    exit 1
fi
echo -e "${GREEN}✓ Celery metrics server is running${NC}"

# Check metrics endpoint
if curl -s http://localhost:9200/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Metrics endpoint is healthy${NC}"
else
    echo -e "${YELLOW}WARNING: Metrics endpoint health check failed${NC}"
    echo "Check logs: podman logs celery-metrics"
fi

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Container Status:"
podman ps --filter "name=celery" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Useful Commands:"
echo "  View Celery logs:          podman logs -f celery"
echo "  View metrics server logs:  podman logs -f celery-metrics"
echo "  Check metrics endpoint:    curl http://localhost:9200/metrics"
echo "  Check health endpoint:     curl http://localhost:9200/health"
echo "  Stop all:                  podman stop celery celery-metrics"
echo "  Remove all:                podman rm celery celery-metrics"
echo "  Restart worker:            podman restart celery"
echo "  Restart metrics:           podman restart celery-metrics"
echo ""
echo -e "${YELLOW}Note: First metrics will be available after 5 minutes (task schedule interval)${NC}"
echo -e "${YELLOW}Configure Prometheus to scrape: http://10.50.31.227:9200/metrics${NC}"
