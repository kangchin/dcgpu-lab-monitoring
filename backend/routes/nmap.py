# backend/routes/nmap.py
# Network scanning operations: nmap execution, device parsing, filtering
import re
import subprocess
import platform
import os
import requests
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, jsonify, request
from utils.models.pdu import PDU
from utils.models.change_log import ChangeLog
from utils.models.ignored_device import IgnoredDevice
from utils.models.disabled_device import DisabledDevice
from utils.factory.database import Database
import logging
from typing import Dict, List, Optional

nmap = Blueprint("nmap", __name__)

logger = logging.getLogger(__name__)


def serialize(doc):
    """Recursively convert ObjectId and datetime to JSON-safe types."""
    from bson import ObjectId
    from datetime import datetime
    if isinstance(doc, list):
        return [serialize(d) for d in doc]
    if isinstance(doc, dict):
        return {k: serialize(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc

# Admin password - should be stored in environment variable in production
ADMIN_PASSWORD = os.environ.get("NMAP_ADMIN_PASSWORD", "admin123")


# ===================================================================
# Network Scanning Functions
# ===================================================================

def scan_network_pdus(parse_nmap_output_fn, filter_ignored_devices_fn, is_windows_with_scanner_fn, get_scanner_service_url_fn):
    """
    Scan networks and return only PDU devices from network scan.
    
    This function performs network scanning only. SNMP extraction is handled separately by pdu.py.
    """
    networks = [
        "10.145.68.0/24",
        "10.145.69.0/24",
        "10.145.70.0/24", 
        "10.145.71.0/24",
        "10.145.132.0/24",
        "10.145.133.0/24",
        "10.145.135.0/24"
    ]

    try:
        scanned_devices = None
        
        # Windows scanner service
        if is_windows_with_scanner_fn():
            try:
                resp = requests.post(
                    f"{get_scanner_service_url_fn()}/scan",
                    json={"networks": networks},
                    timeout=310
                )
                resp.raise_for_status()
                scanned_devices = resp.json()["scanned_devices"]
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                print(f"[WARN] Scanner service unavailable: {str(e)}")
                print("[WARN] Returning empty device list - will use database records instead")
                return {
                    "status": "success",
                    "pdu_count": 0,
                    "pdus": [],
                    "message": "Scanner service unavailable - using existing database records",
                    "timestamp": datetime.now().isoformat()
                }
        else:
            # Check if nmap is available before trying to run it
            try:
                nmap_check = subprocess.run(
                    ["nmap", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if nmap_check.returncode != 0:
                    print("[WARN] nmap not available or not working properly")
                    print("[WARN] Returning empty device list - will use database records instead")
                    return {
                        "status": "success",
                        "pdu_count": 0,
                        "pdus": [],
                        "message": "nmap not available - using existing database records",
                        "timestamp": datetime.now().isoformat()
                    }
            except FileNotFoundError:
                print("[WARN] nmap command not found on this system")
                print("[WARN] Returning empty device list - will use database records instead")
                return {
                    "status": "success",
                    "pdu_count": 0,
                    "pdus": [],
                    "message": "nmap not found - using existing database records",
                    "timestamp": datetime.now().isoformat()
                }
            except subprocess.TimeoutExpired:
                print("[WARN] nmap --version check timed out")
                print("[WARN] Returning empty device list - will use database records instead")
                return {
                    "status": "success",
                    "pdu_count": 0,
                    "pdus": [],
                    "message": "nmap check timed out - using existing database records",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Run the actual nmap scan
            try:
                cmd = ["nmap", "-sn", "-R"] + networks
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300
                )

                if result.returncode != 0:
                    print(f"[WARN] nmap returned error: {result.stderr}")
                    print("[WARN] Returning empty device list - will use database records instead")
                    return {
                        "status": "success",
                        "pdu_count": 0,
                        "pdus": [],
                        "message": f"nmap error - using existing database records",
                        "timestamp": datetime.now().isoformat()
                    }

                scanned_devices = parse_nmap_output_fn(result.stdout)
            except subprocess.TimeoutExpired:
                print("[WARN] nmap scan timed out after 300 seconds")
                print("[WARN] Returning empty device list - will use database records instead")
                return {
                    "status": "success",
                    "pdu_count": 0,
                    "pdus": [],
                    "message": "nmap scan timed out - using existing database records",
                    "timestamp": datetime.now().isoformat()
                }
            except FileNotFoundError:
                print("[WARN] nmap command not found")
                print("[WARN] Returning empty device list - will use database records instead")
                return {
                    "status": "success",
                    "pdu_count": 0,
                    "pdus": [],
                    "message": "nmap not found - using existing database records",
                    "timestamp": datetime.now().isoformat()
                }

        # Filter out ignored devices
        scanned_devices = filter_ignored_devices_fn(scanned_devices)
        
        # Extract PDU data - only devices with "pdu" in hostname
        pdu_devices = scanned_devices.get("pdus", [])
        
        return {
            "status": "success",
            "pdu_count": len(pdu_devices),
            "pdus": pdu_devices,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"[WARN] Network scan exception: {str(e)}")
        print("[WARN] Returning empty device list - will use database records instead")
        return {
            "status": "success",
            "pdu_count": 0,
            "pdus": [],
            "message": f"Network scan failed: {str(e)} - using existing database records",
            "timestamp": datetime.now().isoformat()
        }


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



@nmap.route("/validate-password", methods=["POST"])
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
    """
    Compare scanned devices with database records.
    Systems model is disabled, so we return a basic empty analysis.
    This function is only used by the /scan endpoint which is not required for main features.
    """
    analysis = {
        "new_systems": [],
        "new_pdus": [],
        "changed_system_ips": [],
        "changed_pdu_ips": [],
        "changed_system_hostnames": [],
        "changed_pdu_hostnames": [],
        "possible_system_resets": [],
        "possible_pdu_resets": [],
        "not_detected_systems": [],
        "not_detected_pdus": [],
    }
    return analysis


# -------------------------------------------------------------------
# Update/Ignore Operations
# -------------------------------------------------------------------

@nmap.route("/update-system", methods=["POST"])
@require_admin_password
def update_system():
    """Update system IP address and optionally location."""
    try:
        data = request.json
        system_id   = data.get("system_id")
        new_ip      = data.get("new_ip")
        old_ip      = data.get("old_ip")
        system_name = data.get("system_name")
        location    = data.get("location")          # NEW
        admin_user  = data.get("admin_user", "admin")
        reason      = data.get("reason", "")
 
        if not all([system_id, new_ip, system_name]):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
 
        db = Database()
 
        # Always update the IP; include location if provided
        update_data = {"bmc_ip": new_ip}
        if location:
            update_data["location"] = location
 
        update_result = db.update(system_id, update_data, "systems")
 
        # Log the change
        change_log = ChangeLog()
        new_values = {"bmc_ip": new_ip}
        if location:
            new_values["location"] = location
 
        change_log.create({
            "entity_type":  "system",
            "entity_id":    system_id,
            "entity_name":  system_name,
            "change_type":  "ip_update",
            "old_values":   {"bmc_ip": old_ip} if old_ip else {},
            "new_values":   new_values,
            "changed_by":   admin_user,
            "reason":       reason,
            "created":      datetime.now(),
        })
 
        return jsonify({
            "status":        "success",
            "message":       f"Successfully updated {system_name} IP to {new_ip}",
            "update_result": update_result,
        })
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
 
@nmap.route("/update-hostname", methods=["POST"])
@require_admin_password
def update_hostname():
    """Update system or PDU hostname (and optionally location) in the database."""
    try:
        data         = request.json
        entity_id    = data.get("entity_id")
        entity_type  = data.get("entity_type")   # "system" or "pdu"
        old_hostname = data.get("old_hostname")
        new_hostname = data.get("new_hostname")
        ip           = data.get("ip")
        location     = data.get("location")       # NEW
        admin_user   = data.get("admin_user", "admin")
 
        if not all([entity_id, entity_type, old_hostname, new_hostname]):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
 
        db = Database()
 
        if entity_type == "system":
            # Strip BMC prefix/suffix to get the clean system name
            system_name = new_hostname.replace("bmc-", "").replace(".amd.com", "")
            update_data = {"system": system_name}
            if location:
                update_data["location"] = location
            db.update(entity_id, update_data, "systems")
            entity_name = system_name
 
        elif entity_type == "pdu":
            update_data = {"hostname": new_hostname}
            if location:
                update_data["location"] = location
            db.update(entity_id, update_data, "pdus")
            entity_name = new_hostname
 
        else:
            return jsonify({"status": "error", "message": "Invalid entity_type"}), 400
 
        # Log the change
        new_values = {"hostname": new_hostname}
        if location:
            new_values["location"] = location
 
        change_log = ChangeLog()
        change_log.create({
            "entity_type": entity_type,
            "entity_id":   entity_id,
            "entity_name": entity_name,
            "change_type": "hostname_update",
            "old_values":  {"hostname": old_hostname},
            "new_values":  new_values,
            "changed_by":  admin_user,
            "created":     datetime.now(),
        })
 
        return jsonify({
            "status":  "success",
            "message": f"Successfully updated {entity_type} hostname to {new_hostname}",
        })
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@nmap.route("/create-system", methods=["POST"])
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
        
        if not all([hostname, ip, site, location, username, password]):
            missing = [f for f, v in {"hostname": hostname, "ip": ip, "site": site,
                                       "location": location, "username": username,
                                       "password": password}.items() if not v]
            return jsonify({
                "status": "error",
                "message": f"Missing required fields: {', '.join(missing)}"
            }), 400
        
        # Extract system name from BMC hostname
        # Example: bmc-smci001-odcdh1-a01.amd.com -> smci001-odcdh1-a01
        system_name = hostname.replace("bmc-", "").replace(".amd.com", "")
        
        # Bypass the model validator and write directly to the database
        # so we can include bmc_ip + credentials in one atomic insert
        # Field order matches existing DB documents exactly
        db = Database()
        new_system_data = {
            "system": system_name,
            "site": site,
            "location": location,
            "created": datetime.now(),
            "updated": datetime.now(),
            "bmc_ip": ip,
            "password": password,
            "username": username,
        }
        
        inserted_id = db.insert(new_system_data, "systems")
        
        # Log the change - exclude datetime fields from new_values to avoid
        # serialization issues when the change log is later retrieved
        loggable_values = {k: v for k, v in new_system_data.items()
                           if not isinstance(v, datetime)}
        change_log = ChangeLog()
        change_log.create({
            "entity_type": "system",
            "entity_id": inserted_id,
            "entity_name": system_name,
            "change_type": "create",
            "old_values": {},
            "new_values": loggable_values,
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


@nmap.route("/create-pdu", methods=["POST"])
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
        
        # Log the change - exclude datetime fields from new_values
        loggable_pdu_values = {k: v for k, v in new_pdu_data.items()
                                if not isinstance(v, datetime)}
        change_log = ChangeLog()
        change_log.create({
            "entity_type": "pdu",
            "entity_id": inserted_id,
            "entity_name": hostname,
            "change_type": "create",
            "old_values": {},
            "new_values": loggable_pdu_values,
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


@nmap.route("/ignore-device", methods=["POST"])
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


@nmap.route("/ignored-devices", methods=["GET"])
def get_ignored_devices():
    """Get list of all ignored devices"""
    try:
        ignored_model = IgnoredDevice()
        ignored_devices = ignored_model.find({}, sort=[("created", -1)])
        
        return jsonify({
            "status": "success",
            "ignored_devices": serialize(ignored_devices)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap.route("/unignore-device/<device_id>", methods=["DELETE"])
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


@nmap.route("/change-logs", methods=["GET"])
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
            "change_logs": serialize(logs)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap.route("/disabled-devices", methods=["GET"])
def get_disabled_devices():
    """Get all devices in the disabled collection"""
    try:
        disabled_model = DisabledDevice()
        devices = disabled_model.find({}, sort=[("disabled_at", -1)])
        return jsonify({"status": "success", "disabled_devices": serialize(devices)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@nmap.route("/move-to-disabled", methods=["POST"])
@require_admin_password
def move_to_disabled():
    """Move a system or PDU to the disabled collection"""
    try:
        data = request.json
        entity_id = data.get("entity_id")
        entity_type = data.get("entity_type")  # "system" or "pdu"
        admin_user = data.get("admin_user", "admin")

        if not all([entity_id, entity_type]):
            return jsonify({"status": "error", "message": "Missing entity_id or entity_type"}), 400

        db = Database()
        collection = "systems" if entity_type == "system" else "pdus"
        record = db.find_by_id(entity_id, collection)

        if not record:
            return jsonify({"status": "error", "message": "Record not found"}), 404

        # Already in disabled?
        disabled_model = DisabledDevice()
        existing = disabled_model.find({"entity_id": entity_id})
        if existing:
            return jsonify({"status": "error", "message": "Already in disabled collection"}), 400

        entity_name = record.get("system") if entity_type == "system" else record.get("hostname")
        last_seen = record.get("last_seen")

        loggable_record = {k: v for k, v in record.items() if not isinstance(v, datetime)}
        disabled_model.create({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "last_seen": last_seen,
            "disabled_at": datetime.now(),
            "original_data": loggable_record,
        })

        # Remove from active collection
        db.delete(entity_id, collection)

        change_log = ChangeLog()
        change_log.create({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "change_type": "disabled",
            "old_values": {},
            "new_values": {"status": "disabled"},
            "changed_by": admin_user,
            "created": datetime.now(),
        })

        return jsonify({"status": "success", "message": f"Moved {entity_name} to disabled"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@nmap.route("/restore-from-disabled", methods=["POST"])
@require_admin_password
def restore_from_disabled():
    """Restore a device from the disabled collection back to systems/pdus"""
    try:
        data = request.json
        disabled_id = data.get("disabled_id")
        admin_user = data.get("admin_user", "admin")

        if not disabled_id:
            return jsonify({"status": "error", "message": "Missing disabled_id"}), 400

        disabled_model = DisabledDevice()
        record = disabled_model.find_by_id(disabled_id)

        if not record:
            return jsonify({"status": "error", "message": "Disabled record not found"}), 404

        entity_type = record.get("entity_type")
        entity_name = record.get("entity_name")
        original_data = record.get("original_data", {})
        collection = "systems" if entity_type == "system" else "pdus"

        db = Database()
        db.insert(original_data, collection)

        disabled_model.delete(disabled_id)

        change_log = ChangeLog()
        change_log.create({
            "entity_type": entity_type,
            "entity_id": disabled_id,
            "entity_name": entity_name,
            "change_type": "restored",
            "old_values": {"status": "disabled"},
            "new_values": {"status": "active"},
            "changed_by": admin_user,
            "created": datetime.now(),
        })

        return jsonify({"status": "success", "message": f"Restored {entity_name}"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ===================================================================
# PDU Network Scanning Routes
# ===================================================================

@nmap.route("/pdu", methods=["POST"])
def scan_pdus():
    """Scan networks and return only PDU devices from network scan."""
    try:
        result = scan_network_pdus(
            parse_nmap_output,
            filter_ignored_devices,
            is_windows_with_scanner_service,
            get_scanner_service_url
        )
        
        if result.get("status") == "error":
            return jsonify(result), 500
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------

@nmap.route("/scan", methods=["POST"])
def run_nmap():
    networks = [
        "10.145.68.0/24",
        "10.145.69.0/24",
        "10.145.70.0/24", 
        "10.145.71.0/24",
        "10.145.132.0/24",
        "10.145.133.0/24",
        "10.145.135.0/24"
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
        
        # Add summary counts for each category
        summary = {
            "total_devices": sum(len(scanned_devices.get(cat, [])) for cat in scanned_devices),
            "bmc_systems": len(scanned_devices.get("systems", [])),
            "pdu_devices": len(scanned_devices.get("pdus", [])),
            "non_standard_devices": len(scanned_devices.get("non_standard", [])),
            "devices_without_hostname": len(scanned_devices.get("no_hostname", []))
        }

        return jsonify({
            "status": "success",
            "summary": summary,
            "scanned_devices": scanned_devices,
            "analysis": analysis
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap.route("/scan/status", methods=["GET"])
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