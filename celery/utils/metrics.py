try:
    from prometheus_client import Gauge, Counter, Histogram
except Exception:
    # prometheus_client may not be available in all environments
    Gauge = Counter = Histogram = None

# Power and temperature gauges
if Gauge:
    POWER_GAUGE = Gauge(
        "lab_power_watts",
        "Power reading in watts",
        ["site", "rack", "sensor"],
    )

    TEMP_GAUGE = Gauge(
        "lab_temperature_celsius",
        "Temperature reading in celsius",
        ["site", "sensor"],
    )

    SYSTEM_GPU_TEMP_GAUGE = Gauge(
        "system_gpu_temperature_celsius",
        "GPU temperature per system",
        ["system", "gpu"],
        multiprocess_mode='mostrecent'
    )
else:
    POWER_GAUGE = TEMP_GAUGE = SYSTEM_GPU_TEMP_GAUGE = None

# HTTP metrics
if Counter:
    HTTP_REQ_COUNTER = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["endpoint", "method", "status"],
    )
else:
    HTTP_REQ_COUNTER = None

if Histogram:
    HTTP_REQ_LATENCY = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency in seconds",
        ["endpoint"],
    )
else:
    HTTP_REQ_LATENCY = None

# Task metrics
if Counter:
    TASKS_ENQUEUED = Counter(
        "tasks_enqueued_total",
        "Number of tasks enqueued",
        ["name"],
    )

    TASKS_PROCESSED = Counter(
        "tasks_processed_total",
        "Number of tasks processed",
        ["name", "status"],
    )
else:
    TASKS_ENQUEUED = TASKS_PROCESSED = None
