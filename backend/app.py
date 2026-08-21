import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()

from routes.conductor_system import conductor_system
from routes.power import power
from routes.temperature import temperature
from routes.dashboard import dashboard
from routes.monthly_data import monthly_data
from routes.system_temperature import system_temperature
from routes.power_capacity import power_capacity
from routes.nmap_scan import nmap_scan

app = Flask(__name__)
CORS(
    app,
    origins="*",
)

app.config.update(
    CONDUCTOR_BASE_URL=os.environ.get("CONDUCTOR_BASE_URL", "https://conductor.amd.com"),
    CONDUCTOR_API_ENDPOINT=os.environ.get("CONDUCTOR_API_ENDPOINT", "/api/v1/amdql"),
    CONDUCTOR_API_TOKEN=os.environ.get("CONDUCTOR_API_TOKEN", ""),
    CONDUCTOR_EMAIL=os.environ.get("CONDUCTOR_EMAIL", ""),
    CONDUCTOR_AUTH_FORMAT=os.environ.get("CONDUCTOR_AUTH_FORMAT", "email_key"),
    CONDUCTOR_AUTH_SCHEME=os.environ.get("CONDUCTOR_AUTH_SCHEME", "Bearer"),
    CONDUCTOR_TOKEN_HEADER=os.environ.get("CONDUCTOR_TOKEN_HEADER", "Authorization"),
    CONDUCTOR_SYSTEM_QUERY_PARAM=os.environ.get("CONDUCTOR_SYSTEM_QUERY_PARAM", "system"),
    CONDUCTOR_VERIFY_SSL=os.environ.get("CONDUCTOR_VERIFY_SSL", "true").lower() not in ("false", "0"),
    CONDUCTOR_CA_BUNDLE_PATH=os.environ.get("CONDUCTOR_CA_BUNDLE_PATH", ""),
    CONDUCTOR_TIMEOUT_SECONDS=int(os.environ.get("CONDUCTOR_TIMEOUT_SECONDS", "20")),
    PING_TIMEOUT_SECONDS=int(os.environ.get("PING_TIMEOUT_SECONDS", "15")),
    SSH_KEY_PATH=os.environ.get("SSH_KEY_PATH", ""),
    SSH_USERNAME=os.environ.get("SSH_USERNAME", "root"),
    SSH_TIMEOUT_SECONDS=int(os.environ.get("SSH_TIMEOUT_SECONDS", "10")),
    SSH_DEFAULT_USERNAME=os.environ.get("SSH_DEFAULT_USERNAME", "root"),
    SSH_DEFAULT_PASSWORD=os.environ.get("SSH_DEFAULT_PASSWORD", ""),
)

app.register_blueprint(conductor_system, url_prefix="/api/conductor")
app.register_blueprint(system_temperature, url_prefix="/api/system-temperature")
app.register_blueprint(power, url_prefix="/api/power")
app.register_blueprint(temperature, url_prefix="/api/temperature")
app.register_blueprint(dashboard, url_prefix="/api/dashboard")
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
            "/api/conductor/systems": {
                "get": {
                    "summary": "List Systems by Site / Data Hall / Rack / Level",
                    "description": "Fetch all systems in a locale and filter by site, data hall, rack and/or level parsed from the system name convention `{model}-{site}{dh}-{rack}-{level}`.",
                    "tags": ["Conductor"],
                    "parameters": [
                        {"name": "locale",    "in": "query", "required": False, "schema": {"type": "string", "default": "Penang"}, "description": "Locale to fetch from (default: Penang)"},
                        {"name": "site",      "in": "query", "required": False, "schema": {"type": "string", "example": "odc"},          "description": "Site code, e.g. odc"},
                        {"name": "data_hall", "in": "query", "required": False, "schema": {"type": "string", "example": "dh1"},          "description": "Data hall, e.g. dh1"},
                        {"name": "rack",      "in": "query", "required": False, "schema": {"type": "string", "example": "a01"},          "description": "Rack ID, e.g. a01"},
                        {"name": "level",     "in": "query", "required": False, "schema": {"type": "string", "example": "1"},            "description": "Level, e.g. 1"}
                    ],
                    "responses": {
                        "200": {
                            "description": "Filtered list of systems with parsed metadata",
                            "content": {"application/json": {"example": {"locale": "Penang", "count": 2, "systems": [{"name": "gbt350-odcdh1-a01-1", "model": "gbt350", "site": "odc", "data_hall": "dh1", "rack": "a01", "level": "1"}]}}}
                        },
                        "504": {"description": "Conductor API timed out"},
                        "502": {"description": "Conductor client error"}
                    }
                }
            },
            "/api/conductor/list-systems": {
                "get": {
                    "summary": "List Systems by Locale",
                    "description": "Return all system names from Conductor filtered by locale name (e.g. 'Penang').",
                    "tags": ["Conductor"],
                    "parameters": [
                        {"name": "locale", "in": "query", "required": True, "schema": {"type": "string", "example": "Penang"}, "description": "Locale name to filter by (e.g. 'Penang')"},
                    ],
                    "responses": {
                        "200": {
                            "description": "List of systems in the locale",
                            "content": {"application/json": {"example": {"locale": "Penang", "count": 2, "systems": ["gbt350-odcdh1-a01-1", "gbt350-odcdh1-a01-2"]}}}
                        },
                        "400": {"description": "Missing locale parameter"},
                        "504": {"description": "Conductor API timed out"},
                        "502": {"description": "Conductor client error"}
                    }
                }
            },
            "/api/conductor/system/raw-data": {
                "get": {
                    "summary": "Get System Data",
                    "description": "Retrieve complete system health data from Conductor",
                    "tags": ["Conductor"],
                    "parameters": [
                        {"name": "system_name", "in": "query", "required": True, "schema": {"type": "string", "example": "gbt350-odcdh1-a01-1"}, "description": "Name of the system to query from Conductor"}
                    ],
                    "responses": {
                        "200": {
                            "description": "System health data",
                            "content": {"application/json": {"example": {"details": {"name": "gbt350-odcdh1-a01-1", "status": "healthy"}}}}
                        },
                        "400": {"description": "Missing system_name parameter"},
                        "504": {"description": "Conductor API timed out"},
                        "502": {"description": "Conductor client error"}
                    }
                }
            },
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
            # "/api/systems": {
            #     "get": {
            #         "summary": "Get Systems List",
            #         "description": "List all monitored systems with optional filtering",
            #         "tags": ["Systems"],
            #         "parameters": [
            #             {"name": "site", "in": "query", "schema": {"type": "string", "example": "odcdh1"}, "description": "Site filter (e.g., odcdh1, odcdh2)"},
            #             {"name": "location", "in": "query", "schema": {"type": "string", "example": "a01-1"}, "description": "Location filter (e.g., a01-1)"}
            #         ],
            #         "responses": {"200": {"description": "Systems array"}}
            #     }
            # },
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