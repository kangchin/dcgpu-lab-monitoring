from flask import Flask
from routes.power import power
from routes.temperature import temperature
from routes.dashboard import dashboard
from routes.systems import systems
from routes.monthly_data import monthly_data
from routes.system_temperature import system_temperature
from routes.power_capacity import power_capacity
from flask_cors import CORS
from routes.nmap_scan import nmap_scan

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
app.register_blueprint(nmap_scan, url_prefix="/api/nmap-scan")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)