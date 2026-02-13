# backend/routes/nmap_scan.py
import re
import subprocess
import platform
import os
import requests
from datetime import datetime
from functools import wraps

from flask import Blueprint, jsonify, request
from utils.models.systems import Systems
from utils.models.pdu import PDU
from utils.models.change_log import ChangeLog
from utils.models.ignored_device import IgnoredDevice

nmap_scan = Blueprint("nmap_scan", __name__)

# Admin password - should be stored in environment variable in production
ADMIN_PASSWORD = os.environ.get("NMAP_ADMIN_PASSWORD", "admin123")


def require_admin_password(f):
    """Decorator to require admin password for sensitive operations"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        password = request.json.get("admin_password") if request.json else None
        if not password or password != ADMIN_PASSWORD:
            return jsonify({
                "status": "error",
                "message": "Invalid admin password"
            }), 401
        return f(*args, **kwargs)
    return decorated_function



@nmap_scan.route("/validate-password", methods=["POST"])
def validate_password():
    """Validate admin password for the frontend lock/unlock mechanism"""
    password = request.json.get("admin_password") if request.json else None
    if not password or password != ADMIN_PASSWORD:
        return jsonify({"status": "error", "message": "Invalid admin password"}), 401
    return jsonify({"status": "success"})


# -------------------------------------------------------------------
# Scanner service helpers (Windows Docker support)
# -------------------------------------------------------------------

def is_windows_with_scanner_service():
    return os.environ.get("SCANNER_SERVICE_URL") is not None


def get_scanner_service_url():
    return os.environ.get(
        "SCANNER_SERVICE_URL",
        "http://host.docker.internal:5001"
    )


# -------------------------------------------------------------------
# Nmap parsing
# -------------------------------------------------------------------

def parse_nmap_output(output: str):
    """
    Parse `nmap -sn` output and categorize devices.
    """
    devices = {
        "systems": [],
        "pdus": [],
        "non_standard": [],
        "no_hostname": []
    }

    current_ip = None
    current_hostname = None
    host_is_up = False

    for line in output.splitlines():
        # Hostname + IP
        m = re.search(
            r"Nmap scan report for ([^\s]+) \((\d+\.\d+\.\d+\.\d+)\)",
            line
        )
        if m:
            _finalize_device(devices, current_ip, current_hostname, host_is_up)
            current_hostname, current_ip = m.group(1), m.group(2)
            host_is_up = False
            continue

        # IP only
        m = re.search(
            r"Nmap scan report for (\d+\.\d+\.\d+\.\d+)",
            line
        )
        if m:
            _finalize_device(devices, current_ip, current_hostname, host_is_up)
            current_ip = m.group(1)
            current_hostname = None
            host_is_up = False
            continue

        if "Host is up" in line:
            host_is_up = True

    _finalize_device(devices, current_ip, current_hostname, host_is_up)
    return devices


def _finalize_device(devices, ip, hostname, host_is_up):
    if not ip or not host_is_up:
        return

    if hostname:
        categorize_device(devices, ip, hostname)
    else:
        devices["no_hostname"].append({
            "ip": ip,
            "hostname": None
        })


def categorize_device(devices, ip, hostname):
    hostname_l = hostname.lower()
    entry = {"ip": ip, "hostname": hostname}

    if "bmc" in hostname_l:
        devices["systems"].append(entry)
    elif "pdu" in hostname_l:
        devices["pdus"].append(entry)
    else:
        devices["non_standard"].append(entry)


# -------------------------------------------------------------------
# Ignored devices filtering
# -------------------------------------------------------------------

def get_ignored_hostnames():
    """Get list of ignored hostnames from database"""
    try:
        ignored_model = IgnoredDevice()
        ignored_devices = ignored_model.find({})
        return set(d.get("hostname", "").lower() for d in ignored_devices if d.get("hostname"))
    except Exception as e:
        print(f"Error fetching ignored devices: {e}")
        return set()


def filter_ignored_devices(scanned_devices):
    """Remove ignored devices from scan results"""
    ignored_hostnames = get_ignored_hostnames()
    
    if not ignored_hostnames:
        return scanned_devices
    
    filtered = {}
    for category, devices in scanned_devices.items():
        filtered[category] = [
            d for d in devices 
            if not d.get("hostname") or d.get("hostname", "").lower() not in ignored_hostnames
        ]
    
    return filtered


# -------------------------------------------------------------------
# Database comparison
# -------------------------------------------------------------------

def compare_with_database(scanned_devices):
    systems_model = Systems()
    pdu_model = PDU()

    tracked_systems = systems_model.find({})
    tracked_pdus = pdu_model.find({})

    # system name -> system record
    systems_by_name = {
        s.get("system", "").lower(): s
        for s in tracked_systems
        if s.get("system")
    }

    systems_by_ip = {
        s.get("bmc_ip"): s
        for s in tracked_systems
        if s.get("bmc_ip")
    }

    pdus_by_name = {p.get("hostname", "").lower(): p for p in tracked_pdus}

    analysis = {
        "new_systems": [],
        "new_pdus": [],
        "changed_system_ips": [],
        "changed_pdu_ips": [],
        "possible_system_resets": [],
        "possible_pdu_resets": []
    }

    # ----------------------------
    # Systems (BMC hostname logic)
    # ----------------------------
    for d in scanned_devices["systems"]:
        bmc_hostname = d["hostname"].lower()
        ip = d["ip"]

        matched_system = None

        for system_name, system_record in systems_by_name.items():
            if system_name in bmc_hostname:
                matched_system = system_record
                break

        if not matched_system:
            analysis["new_systems"].append(d)
        else:
            old_ip = matched_system.get("bmc_ip")
            if old_ip and old_ip != ip:
                analysis["changed_system_ips"].append({
                    "hostname": matched_system.get("system"),
                    "old_ip": old_ip,
                    "new_ip": ip,
                    "_id": matched_system.get("_id")
                })

    # ----------------------------
    # Possible system resets
    # ----------------------------
    for d in scanned_devices["non_standard"] + scanned_devices["no_hostname"]:
        ip = d["ip"]
        if ip in systems_by_ip:
            s = systems_by_ip[ip]
            analysis["possible_system_resets"].append({
                "ip": ip,
                "expected_hostname": s.get("system"),
                "current_hostname": d.get("hostname")
            })

    # ----------------------------
    # PDUs
    # ----------------------------
    for d in scanned_devices["pdus"]:
        hostname = d["hostname"]
        name = hostname.lower()
        ip = d["ip"]
        
        if name not in pdus_by_name:
            analysis["new_pdus"].append(d)
        else:
            # Check for IP changes
            pdu_record = pdus_by_name[name]
            # PDU model doesn't have an IP field currently, so we can't check for changes
            # If you want to track PDU IP changes, you'll need to add an IP field to the PDU model

    return analysis


# -------------------------------------------------------------------
# Update/Ignore Operations
# -------------------------------------------------------------------

@nmap_scan.route("/update-system", methods=["POST"])
@require_admin_password
def update_system():
    """Update system information (IP address, etc.)"""
    try:
        data = request.json
        system_id = data.get("system_id")
        new_ip = data.get("new_ip")
        old_ip = data.get("old_ip")
        system_name = data.get("system_name")
        admin_user = data.get("admin_user", "admin")
        reason = data.get("reason", "")
        
        if not all([system_id, new_ip, system_name]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400
        
        # Update the system
        systems_model = Systems()
        update_result = systems_model.update(system_id, {"bmc_ip": new_ip})
        
        # Log the change
        change_log = ChangeLog()
        change_log.create({
            "entity_type": "system",
            "entity_id": system_id,
            "entity_name": system_name,
            "change_type": "ip_update",
            "old_values": {"bmc_ip": old_ip} if old_ip else {},
            "new_values": {"bmc_ip": new_ip},
            "changed_by": admin_user,
            "reason": reason,
            "created": datetime.now()
        })
        
        return jsonify({
            "status": "success",
            "message": f"Successfully updated {system_name} IP to {new_ip}",
            "update_result": update_result
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/create-system", methods=["POST"])
@require_admin_password
def create_system():
    """Create a new system from scan results"""
    try:
        data = request.json
        hostname = data.get("hostname")
        ip = data.get("ip")
        site = data.get("site", "")
        location = data.get("location", "")
        username = data.get("username", "")
        password = data.get("password", "")
        admin_user = data.get("admin_user", "admin")
        reason = data.get("reason", "")
        
        if not all([hostname, ip]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields (hostname and ip)"
            }), 400
        
        # Extract system name from BMC hostname
        # Example: bmc-smci001-odcdh1-a01.amd.com -> smci001-odcdh1-a01
        system_name = hostname.replace("bmc-", "").replace(".amd.com", "")
        
        # Create the system
        systems_model = Systems()
        new_system_data = {
            "system": system_name,
            "bmc_ip": ip,
            "site": site,
            "location": location,
            "created": datetime.now(),
            "updated": datetime.now()
        }
        
        # Add credentials if provided
        if username:
            new_system_data["username"] = username
        if password:
            new_system_data["password"] = password
        
        result = systems_model.create(new_system_data)
        
        # Extract the inserted ID from result string ("Inserted Id <id>")
        inserted_id = result.split("Inserted Id ")[-1] if "Inserted Id" in result else None
        
        # Log the change
        change_log = ChangeLog()
        change_log.create({
            "entity_type": "system",
            "entity_id": inserted_id,
            "entity_name": system_name,
            "change_type": "create",
            "old_values": {},
            "new_values": new_system_data,
            "changed_by": admin_user,
            "reason": reason,
            "created": datetime.now()
        })
        
        return jsonify({
            "status": "success",
            "message": f"Successfully created system {system_name}",
            "system_id": inserted_id
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/create-pdu", methods=["POST"])
@require_admin_password
def create_pdu():
    """Create a new PDU from scan results"""
    try:
        data = request.json
        hostname = data.get("hostname")
        ip = data.get("ip")
        site = data.get("site", "")
        location = data.get("location", "")
        output_power_total_oid = data.get("output_power_total_oid", "")
        v2c = data.get("v2c", "amd123")
        admin_user = data.get("admin_user", "admin")
        reason = data.get("reason", "")
        
        if not all([hostname, output_power_total_oid, site, location]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields (hostname, output_power_total_oid, site, location)"
            }), 400
        
        # Create the PDU
        pdu_model = PDU()
        new_pdu_data = {
            "hostname": hostname,
            "output_power_total_oid": output_power_total_oid,
            "site": site,
            "location": location,
            "v2c": v2c,
            "created": datetime.now(),
            "updated": datetime.now()
        }
        
        result = pdu_model.create(new_pdu_data)
        
        # Extract the inserted ID
        inserted_id = result.split("Inserted Id ")[-1] if "Inserted Id" in result else None
        
        # Log the change
        change_log = ChangeLog()
        change_log.create({
            "entity_type": "pdu",
            "entity_id": inserted_id,
            "entity_name": hostname,
            "change_type": "create",
            "old_values": {},
            "new_values": new_pdu_data,
            "changed_by": admin_user,
            "reason": reason,
            "created": datetime.now()
        })
        
        return jsonify({
            "status": "success",
            "message": f"Successfully created PDU {hostname}",
            "pdu_id": inserted_id
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/ignore-device", methods=["POST"])
@require_admin_password
def ignore_device():
    """Add a device to the ignored list"""
    try:
        data = request.json
        hostname = data.get("hostname")
        device_type = data.get("device_type")  # "system" or "pdu"
        reason = data.get("reason", "")
        admin_user = data.get("admin_user", "admin")
        
        if not all([hostname, device_type]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields (hostname and device_type)"
            }), 400
        
        # Check if already ignored
        ignored_model = IgnoredDevice()
        existing = ignored_model.find({"hostname": hostname})
        
        if existing:
            return jsonify({
                "status": "error",
                "message": f"Device {hostname} is already ignored"
            }), 400
        
        # Add to ignored list
        result = ignored_model.create({
            "hostname": hostname,
            "device_type": device_type,
            "reason": reason,
            "ignored_by": admin_user,
            "created": datetime.now(),
            "updated": datetime.now()
        })
        
        return jsonify({
            "status": "success",
            "message": f"Successfully ignored device {hostname}"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/ignored-devices", methods=["GET"])
def get_ignored_devices():
    """Get list of all ignored devices"""
    try:
        ignored_model = IgnoredDevice()
        ignored_devices = ignored_model.find({}, sort=[("created", -1)])
        
        return jsonify({
            "status": "success",
            "ignored_devices": ignored_devices
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/unignore-device/<device_id>", methods=["DELETE"])
@require_admin_password
def unignore_device(device_id):
    """Remove a device from the ignored list"""
    try:
        ignored_model = IgnoredDevice()
        result = ignored_model.delete(device_id)
        
        if result:
            return jsonify({
                "status": "success",
                "message": "Device removed from ignored list"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Device not found in ignored list"
            }), 404
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/change-logs", methods=["GET"])
def get_change_logs():
    """Get change logs with optional filtering"""
    try:
        # Get query parameters
        entity_type = request.args.get("entity_type")
        entity_name = request.args.get("entity_name")
        limit = int(request.args.get("limit", 100))
        
        # Build query filter
        query_filter = {}
        if entity_type:
            query_filter["entity_type"] = entity_type
        if entity_name:
            query_filter["entity_name"] = entity_name
        
        change_log = ChangeLog()
        logs = change_log.find(query_filter, sort=[("created", -1)], limit=limit)
        
        return jsonify({
            "status": "success",
            "change_logs": logs
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------

@nmap_scan.route("/scan", methods=["POST"])
def run_nmap_scan():
    networks = [
        "10.145.71.0/24",
        "10.145.70.0/24",
        "10.145.69.0/24",
        "10.145.132.0/24",
        "10.145.133.0/24",
        "10.145.135.0/24",
    ]

    try:
        # Windows scanner service
        if is_windows_with_scanner_service():
            resp = requests.post(
                f"{get_scanner_service_url()}/scan",
                json={"networks": networks},
                timeout=310
            )
            resp.raise_for_status()
            scanned_devices = resp.json()["scanned_devices"]

        # Local nmap
        else:
            cmd = ["nmap", "-sn", "-R"] + networks
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode != 0:
                return jsonify({
                    "status": "error",
                    "message": result.stderr
                }), 500

            scanned_devices = parse_nmap_output(result.stdout)

        # Filter out ignored devices
        scanned_devices = filter_ignored_devices(scanned_devices)
        
        analysis = compare_with_database(scanned_devices)

        return jsonify({
            "status": "success",
            "scanned_devices": scanned_devices,
            "analysis": analysis
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/scan/status", methods=["GET"])
def scan_status():
    try:
        if is_windows_with_scanner_service():
            r = requests.get(f"{get_scanner_service_url()}/status", timeout=5)
            r.raise_for_status()
            return jsonify({
                "status": "available",
                "method": "scanner_service",
                **r.json()
            })

        result = subprocess.run(
            ["nmap", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            raise RuntimeError("nmap not available")

        return jsonify({
            "status": "available",
            "method": "local_nmap",
            "version": result.stdout.splitlines()[0],
            "platform": platform.system()
        })

    except Exception as e:
        return jsonify({
            "status": "unavailable",
            "message": str(e)
        }), 503