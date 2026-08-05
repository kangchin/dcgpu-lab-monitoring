# Run DCGPU Lab Monitoring Locally on Windows (No Docker)

This guide starts the project fully on your local machine without Docker.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Location](#2-project-location)
3. [Python Environment and Dependencies](#3-python-environment-and-dependencies)
4. [Frontend Dependencies](#4-frontend-dependencies)
5. [Local Environment Files](#5-local-environment-files)
6. [Start Services](#6-start-services)
7. [Quick Verification](#7-quick-verification)
7.5. [API Documentation - Swagger UI](#75-api-documentation--swagger-ui)
8. [Common Issues](#8-common-issues)

## 1) Prerequisites

Install or verify:

- Python 3.10
- Node.js 22+ and npm
- Redis server
- Nmap (for scanner features)

Optional helper:

- Run setup-windows.ps1 as Administrator to install and configure Nmap automatically.

## 2) Project Location

Open PowerShell and go to the local repository:

C:\Users\aikhosaw\dcgpu-lab-monitoring

## 3) Python Environment and Dependencies

Install backend and celery requirements:

py -3.10 -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r backend\requirements.txt
py -3.10 -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r celery\requirements.txt

Note:
- If corporate SSL inspection blocks pip, keep the trusted-host flags shown above.

## 4) Frontend Dependencies

In a separate PowerShell window:

cd C:\Users\aikhosaw\dcgpu-lab-monitoring\frontend
npm install

## 5) Local Environment Files

Use values from the root .env file for all configuration.

Recommended file setup:

- Root env: `.env` (contains all configuration values)

Note: Refer to the root `.env` file for all credentials and configuration values.

## 6) Start Services (Each in Its Own Terminal)

Terminal A: Redis

Before starting, retrieve REDIS_PASSWORD from the root .env file, then run:

redis-server --port 6379 --requirepass <REDIS_PASSWORD>

Terminal B: Backend API

py -3.10 C:\Users\aikhosaw\dcgpu-lab-monitoring\backend\app.py

Backend URL:
- http://localhost:5000

Terminal C: Frontend

npm --prefix C:\Users\aikhosaw\dcgpu-lab-monitoring\frontend run dev

Frontend URL:
- http://localhost:3005

Terminal D: Celery Worker (Windows compatible)

py -3.10 -m celery --workdir C:\Users\aikhosaw\dcgpu-lab-monitoring\celery -A celery_app worker --loglevel=INFO --pool=solo

Terminal E: Celery Beat Scheduler (separate process)

py -3.10 -m celery --workdir C:\Users\aikhosaw\dcgpu-lab-monitoring\celery -A celery_app beat --loglevel=INFO

Important on Windows:
- Do not use -B with celery worker. Windows does not support worker + beat in one process.
- Always run worker and beat as two separate terminals.

## 7) Quick Verification

- Open http://localhost:3005
- Backend health check by opening any API path, for example:
  - http://localhost:5000/api/dashboard
- Confirm Redis is running on port 6379.
- Confirm both Celery worker and Celery beat terminals are active without import errors.

## 7.5) API Documentation (Swagger UI)

Once the backend is running, access interactive API documentation:

- **Swagger UI**: http://localhost:5000/docs
- **OpenAPI Spec**: http://localhost:5000/openapi.json

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive endpoint testing
- Request/response examples
- All endpoints organized by category (Dashboard, Power, Temperature, Systems, Network)

## 8) Common Issues

1. ModuleNotFoundError: at_scale_python_api
- Cause: private package is not installed for your active Python 3.10 environment.
- Fix: run the private package install command from section 3.

2. Celery error about -B on Windows
- Cause: worker started with -B.
- Fix: run worker and beat separately (sections 6D and 6E).

3. Frontend npm ENOENT package.json
- Cause: npm run dev launched from wrong folder.
- Fix: use npm --prefix C:\Users\aikhosaw\dcgpu-lab-monitoring\frontend run dev

4. Redis connection failure from backend/celery
- Cause: REDIS_HOST or Celery URLs in .env still point to Docker hostnames.
- Fix: Ensure backend\.env and celery\.env have correct values from root .env file with REDIS_HOST=localhost and proper Celery broker URLs.