from prometheus_client import Gauge, Counter, Histogram

# Power and temperature gauges
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

# HTTP metrics
HTTP_REQ_COUNTER = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["endpoint", "method", "status"],
)

HTTP_REQ_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"],
)

# Task metrics
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
