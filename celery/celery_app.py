# celery/celery_app.py - UPDATED VERSION

import tasks
import os
from celery import Celery
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Celery(
    "celery_app",
    broker=os.environ.get("CELERY_BROKER_URL"),
    backend=os.environ.get("CELERY_RESULT_BACKEND"),
    include=["tasks.cron"],
)

app.autodiscover_tasks(["tasks"])

app.conf.broker_connection_retry_on_startup = True
app.conf.result_expires = 600
app.conf.accept_content = ["json", "yaml"]
app.conf.worker_send_task_events = True
app.conf.enable_utc = False
app.conf.timezone = "Asia/Kuala_Lumpur"

# Updated beat schedule with more frequent system temperature checks
app.conf.beat_schedule = {
    "fetch_power": {
        "task": "tasks.cron.fetch_power_data",
        "schedule": timedelta(minutes=10),
    },
    "fetch_temperature": {
        "task": "tasks.cron.fetch_temperature_data",
        "schedule": timedelta(minutes=10),
    },
    # Run every 30 seconds to catch critical systems quickly
    # The task itself will determine which systems to check based on their status
    "fetch_system_temperature": {
        "task": "tasks.cron.fetch_system_temperature_data",
        "schedule": timedelta(seconds=30),  # Changed from 5 minutes to 30 seconds
    },
}