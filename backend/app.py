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

# OpenAPI Specification
@app.route('/openapi.json')
def openapi_spec():
    return jsonify({
        "openapi": "3.0.0",
        "info": {
            "title": "DCGPU Lab Monitoring API",
            "description": "Complete API for DCGPU Lab infrastructure monitoring including power, temperature, systems, and network scanning",
            "version": "1.0.0",
            "contact": {"name": "DCGPU Lab Team"}
        },
        "servers": [{"url": "http://localhost:5000", "description": "Local Development"}],
        "paths": {
            "/api/dashboard": {
                "get": {
                    "summary": "Get Total Power by Site",
                    "description": "Retrieve total power consumption aggregated by site with Redis caching (10min TTL)",
                    "tags": ["Dashboard"],
                    "responses": {
                        "200": {
                            "description": "Total power per site",
                            "content": {"application/json": {"example": {"odcdh1": 100, "odcdh2": 150}}}
                        }
                    }
                }
            },
            "/api/dashboard/total-power": {
                "get": {
                    "summary": "Get Site Total Power",
                    "tags": ["Dashboard"],
                    "parameters": [
                        {"name": "site", "in": "query", "required": True, "schema": {"type": "string"}, "description": "Site identifier"}
                    ],
                    "responses": {"200": {"description": "Total power for site"}}
                }
            },
            "/api/power": {
                "get": {
                    "summary": "Get Power Data",
                    "description": "Query power consumption data with optional filtering and timeline",
                    "tags": ["Power"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2, odcdh3, odcdh4, odcdh5)"},
                        {"name": "location", "in": "query", "schema": {"type": "string", "example": "rack-1"}, "description": "Location regex filter (e.g., rack-1, row-a, dh3)"},
                        {"name": "timeline", "in": "query", "schema": {"type": "string", "enum": ["24h", "7d", "1mnth"], "example": "24h"}, "description": "Time range (available: 24h, 7d, 1mnth)"},
                        {"name": "aggregate", "in": "query", "schema": {"type": "string", "example": "hourly"}, "description": "Aggregate data (for charts) - e.g., hourly, daily, weekly"}
                    ],
                    "responses": {"200": {"description": "Power readings array"}}
                }
            },
            "/api/power/latest": {
                "get": {
                    "summary": "Get Latest Power Reading",
                    "description": "Get most recent power reading per location",
                    "tags": ["Power"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"}
                    ],
                    "responses": {"200": {"description": "Latest power reading"}}
                }
            },
            "/api/power/monthly-summary": {
                "get": {
                    "summary": "Get Monthly Power Summary",
                    "description": "Aggregate monthly power consumption by site",
                    "tags": ["Power"],
                    "parameters": [
                        {"name": "sites", "in": "query", "schema": {"type": "string", "example": "odcdh1,odcdh2,odcdh3"}, "description": "Comma-separated site list (e.g., odcdh1,odcdh2,odcdh3)"}
                    ],
                    "responses": {"200": {"description": "Monthly power summary"}}
                }
            },
            "/api/temperature": {
                "get": {
                    "summary": "Get Temperature Data",
                    "description": "Query temperature readings with optional filtering and timeline",
                    "tags": ["Temperature"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"},
                        {"name": "location", "in": "query", "schema": {"type": "string", "example": "a01-up"}, "description": "Location filter (e.g., a01-up)"},
                        {"name": "timeline", "in": "query", "schema": {"type": "string", "enum": ["24h", "7d", "1mnth"], "example": "24h"}, "description": "Time range (24h, 7d, 1mnth)"}
                    ],
                    "responses": {"200": {"description": "Temperature readings array"}}
                }
            },
            "/api/temperature/latest": {
                "get": {
                    "summary": "Get Latest Temperature by Location",
                    "description": "Get most recent temperature reading per location (aggregated)",
                    "tags": ["Temperature"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"}
                    ],
                    "responses": {"200": {"description": "Latest temperature readings"}}
                }
            },
            "/api/systems": {
                "get": {
                    "summary": "Get Systems List",
                    "description": "List all monitored systems with optional filtering",
                    "tags": ["Systems"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"},
                        {"name": "location", "in": "query", "schema": {"type": "string", "example": "a01-1"}, "description": "Location filter (e.g., a01-1)"}
                    ],
                    "responses": {"200": {"description": "Systems array"}}
                }
            },
            "/api/system-temperature": {
                "get": {
                    "summary": "Get System Temperatures",
                    "description": "Retrieve temperature data for CPU/GPU systems",
                    "tags": ["System Temperature"],
                    "parameters": [
                        {"name": "system", "in": "query", "schema": {"type": "string", "example": "gpu-node-1"}, "description": "System identifier (e.g., gpu-node-1, cpu-server-5, hpc-01)"},
                        {"name": "timeline", "in": "query", "schema": {"type": "string", "enum": ["24h", "7d", "1mnth"], "example": "24h"}, "description": "Time range (24h, 7d, 1mnth)"}
                    ],
                    "responses": {"200": {"description": "System temperature readings"}}
                }
            },
            "/api/system-temperature/latest": {
                "get": {
                    "summary": "Get Latest System Temperatures",
                    "description": "Get most recent temperature for each system with coverage metadata",
                    "tags": ["System Temperature"],
                    "responses": {
                        "200": {
                            "description": "Latest temperatures with coverage statistics",
                            "content": {
                                "application/json": {
                                    "example": {
                                        "temperature_data": [],
                                        "system_coverage": {
                                            "total_expected_systems": 10,
                                            "systems_with_temperature_data": 8
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/power-capacity": {
                "get": {
                    "summary": "Get Power Capacity Data",
                    "description": "Load capacity data with auto-save for previous month",
                    "tags": ["Power Capacity"],
                    "responses": {"200": {"description": "Capacity data"}}
                }
            },
            "/api/power-capacity/current-previous": {
                "get": {
                    "summary": "Get Current and Previous Capacity",
                    "description": "O(1) capacity response via Redis cache per location",
                    "tags": ["Power Capacity"],
                    "parameters": [
                        {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"}
                    ],
                    "responses": {
                        "200": {
                            "description": "Current and previous capacity",
                            "content": {
                                "application/json": {
                                    "example": {"current": 5000, "previous": 4800}
                                }
                            }
                        }
                    }
                }
            },
            "/api/monthly-power-data": {
                "get": {
                    "summary": "Get Monthly Power Data",
                    "description": "Retrieve all monthly power data from JSON file",
                    "tags": ["Monthly Data"],
                    "responses": {"200": {"description": "Monthly power data"}}
                },
                "post": {
                    "summary": "Save Monthly Power Data",
                    "description": "Save or update monthly power data with timestamp",
                    "tags": ["Monthly Data"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"data": {"type": "array", "items": {"type": "object"}}}
                                }
                            }
                        }
                    },
                    "responses": {"200": {"description": "Save status"}}
                }
            },
            "/api/monthly-power-data/auto-save": {
                "post": {
                    "summary": "Trigger Auto-Save",
                    "description": "Manually trigger auto-save for previous month (testing)",
                    "tags": ["Monthly Data"],
                    "responses": {"200": {"description": "Auto-save completion status"}}
                }
            },
            "/api/monthly-power-data/compare": {
                "get": {
                    "summary": "Compare Current vs Previous Month",
                    "description": "Compare power consumption metrics between current and previous month",
                    "tags": ["Monthly Data"],
                    "parameters": [
                        {"name": "site", "in": "query", "required": True, "schema": {"type": "string", "example": "odcdh1"}, "description": "Site identifier (e.g., odcdh1, odcdh2)"}
                    ],
                    "responses": {
                        "200": {
                            "description": "Month comparison",
                            "content": {
                                "application/json": {
                                    "example": {
                                        "site": "odcdh1",
                                        "current": 1500,
                                        "previous": 1450,
                                        "change": 3.45
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/monthly-power-data/recalculate-missing": {
                "get": {
                    "summary": "Recalculate Missing Months",
                    "description": "Scan and recalculate power totals for missing months (preview)",
                    "tags": ["Monthly Data"],
                    "parameters": [
                        {"name": "months", "in": "query", "schema": {"type": "integer", "default": 24, "example": 24}, "description": "Months back to scan (e.g., 24, 12, 6)"}
                    ],
                    "responses": {"200": {"description": "Missing months calculation"}}
                }
            },
            "/api/nmap-scan/validate-password": {
                "post": {
                    "summary": "Validate Admin Password",
                    "description": "Validate admin password for lock/unlock mechanism",
                    "tags": ["Network Scanning"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"type": "object", "properties": {"admin_password": {"type": "string"}}}
                            }
                        }
                    },
                    "responses": {"200": {"description": "Validation status"}, "401": {"description": "Invalid password"}}
                }
            },
            "/api/nmap-scan/update-system": {
                "post": {
                    "summary": "Update System Information",
                    "description": "Update system details (requires admin password)",
                    "tags": ["Network Scanning"],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object"}}}},
                    "responses": {"200": {"description": "Update status"}, "401": {"description": "Invalid password"}}
                }
            },
            "/api/nmap-scan/update-hostname": {
                "post": {
                    "summary": "Update Hostname",
                    "description": "Update system hostname (requires admin password)",
                    "tags": ["Network Scanning"],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object"}}}},
                    "responses": {"200": {"description": "Update status"}}
                }
            },
            "/api/nmap-scan/create-system": {
                "post": {
                    "summary": "Create New System",
                    "description": "Create new monitored system (requires admin password)",
                    "tags": ["Network Scanning"],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object"}}}},
                    "responses": {"200": {"description": "Creation status"}}
                }
            },
            "/api/nmap-scan/create-pdu": {
                "post": {
                    "summary": "Create New PDU",
                    "description": "Create new Power Distribution Unit with SNMP detection (requires admin password)",
                    "tags": ["Network Scanning"],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object"}}}},
                    "responses": {"200": {"description": "PDU creation status"}}
                }
            },
            "/api/nmap-scan/ignore-device": {
                "post": {
                    "summary": "Ignore Device",
                    "description": "Add device to ignored list (requires admin password)",
                    "tags": ["Network Scanning"],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object"}}}},
                    "responses": {"200": {"description": "Ignore status"}}
                }
            },
            "/api/nmap-scan/ignored-devices": {
                "get": {
                    "summary": "Get Ignored Devices",
                    "description": "List all devices in ignored list",
                    "tags": ["Network Scanning"],
                    "responses": {"200": {"description": "Ignored devices array"}}
                }
            }
        }
    })

# Swagger UI
@app.route('/docs')
def swagger_ui():
    html = '''<!DOCTYPE html>
<html>
<head>
    <title>DCGPU Lab API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
            layout: "StandaloneLayout"
        });
    }
    </script>
</body>
</html>'''
    return html

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)