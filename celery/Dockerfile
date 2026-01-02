FROM python:3.10-slim-bullseye

WORKDIR /app

# Install system dependencies including ipmitool
RUN apt-get update && \
    apt-get install -y ipmitool && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Add entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["celery", "-A", "celery_app", "worker", "-B", "--loglevel=INFO"]