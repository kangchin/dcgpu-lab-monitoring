# Run DCGPU Lab Monitoring Locally on Windows (No Docker)

This guide starts the project fully on your local machine without Docker.

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

Use values from the root .env file.

Current .env values:

- MONGODB_URL=mongodb://dcgpu_lab:amd12345@dcgpu-lab.amd.com:27017/lab-monitoring?authSource=admin
- MONGODB_DB=lab-monitoring
- REDIS_HOST=redis
- REDIS_PORT=6379
- REDIS_PASSWORD=amd12345
- CELERY_BROKER_URL=redis://:amd12345@redis:6379
- CELERY_RESULT_BACKEND=redis://:amd12345@redis:6379
- WORKER_METRICS_PORT=9200
- NMAP_ADMIN_PASSWORD=change_me_admin_password
- FAN_SPEED_MAX_WORKERS=10
- FAN_SPEED_BATCH_SIZE=33
- NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
- CONDUCTOR_MATCH_TERM=odcdh
- CONDUCTOR_PAGE_SIZE=500
- OUTPUT=jsonl
- RPI_HOSTNAME=
- RPI_USERNAME=
- RPI_PASSWORD=
- RPI_REMOTE_FILE_PATH=

Recommended file setup:

- Root env: .env
- Copy same env values into:
  - backend\.env
  - celery\.env
- Frontend local env:
  - frontend\.env.local
  - include NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

## 6) Start Services (Each in Its Own Terminal)

Terminal A: Redis

redis-server --port 6379 --requirepass amd12345

Terminal B: Backend API

cd C:\Users\aikhosaw\dcgpu-lab-monitoring\backend
py -3.10 app.py

Backend URL:
- http://localhost:5000

Terminal C: Frontend

npm --prefix C:\Users\aikhosaw\dcgpu-lab-monitoring\frontend run dev

Frontend URL:
- http://localhost:3005

Terminal D: Celery Worker (Windows compatible)

cd C:\Users\aikhosaw\dcgpu-lab-monitoring\celery
py -3.10 -m celery -A celery_app worker --loglevel=INFO --pool=solo

Terminal E: Celery Beat Scheduler (separate process)

cd C:\Users\aikhosaw\dcgpu-lab-monitoring\celery
py -3.10 -m celery -A celery_app beat --loglevel=INFO

Important on Windows:
- Do not use -B with celery worker. Windows does not support worker + beat in one process.
- Always run worker and beat as two separate terminals.

## 7) Quick Verification

- Open http://localhost:3005
- Backend health check by opening any API path, for example:
  - http://localhost:5000/api/dashboard
- Confirm Redis is running on port 6379.
- Confirm both Celery worker and Celery beat terminals are active without import errors.

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
- Cause: env still points to REDIS_HOST=redis (Docker hostname).
- Fix: set REDIS_HOST=localhost and update Celery URLs to localhost.
