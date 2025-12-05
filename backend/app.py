from flask import Flask, Response, request
from routes.power import power
from routes.temperature import temperature
from routes.dashboard import dashboard
from routes.systems import systems
from routes.monthly_data import monthly_data
from routes.system_temperature import system_temperature
from routes.power_capacity import power_capacity
from flask_cors import CORS
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from utils.metrics import HTTP_REQ_COUNTER, HTTP_REQ_LATENCY
import time

app = Flask(__name__)
CORS(
    app,
    origins="*",
)

app.register_blueprint(system_temperature, url_prefix="/api/system-temperature")
app.register_blueprint(power, url_prefix="/api/power")
app.register_blueprint(temperature, url_prefix="/api/temperature")
app.register_blueprint(dashboard, url_prefix="/api/dashboard")
app.register_blueprint(systems, url_prefix="/api/systems")
app.register_blueprint(monthly_data, url_prefix="/api/monthly-power-data")
app.register_blueprint(power_capacity, url_prefix="/api/power-capacity")


@app.before_request
def start_timer():
    request._start_time = time.time()


@app.after_request
def record_request(response):
    try:
        elapsed = time.time() - request._start_time
        endpoint = request.path
        method = request.method
        status = response.status_code
        HTTP_REQ_COUNTER.labels(endpoint=endpoint, method=method, status=status).inc()
        HTTP_REQ_LATENCY.labels(endpoint=endpoint).observe(elapsed)
    except Exception:
        pass
    return response


@app.route("/metrics")
def metrics():
    data = generate_latest()
    return Response(data, mimetype=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)