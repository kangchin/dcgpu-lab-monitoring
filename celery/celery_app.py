import os
from celery import Celery
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

app = Celery(
    "celery_app",
    broker=os.environ.get("CELERY_BROKER_URL"),
    backend=os.environ.get("CELERY_RESULT_BACKEND"),
)

app.autodiscover_tasks(["tasks"])

app.conf.update(
    broker_connection_retry_on_startup=True,
    result_expires=600,
    accept_content=["json"],
    worker_send_task_events=True,
    enable_utc=False,
    timezone="Asia/Kuala_Lumpur",

    # CRITICAL stability settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=100,
    task_time_limit=120,
    task_soft_time_limit=90,
)

app.conf.beat_schedule = {
    "fetch_power": {
        "task": "tasks.cron.fetch_power_data",
        "schedule": timedelta(minutes=10),
    },
    "fetch_temperature": {
        "task": "tasks.cron.fetch_temperature_data",
        "schedule": timedelta(minutes=10),
    },
    "fetch_system_temperature": {
        "task": "tasks.cron.fetch_system_temperature_data",
        "schedule": timedelta(seconds=30),
    },
}
