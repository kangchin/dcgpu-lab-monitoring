# backend/routes/nmap_scan.py
import re
import subprocess
import platform
import os
import requests
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, jsonify, request
from utils.models.systems import Systems
from utils.models.pdu import PDU
from utils.models.change_log import ChangeLog
from utils.models.ignored_device import IgnoredDevice
from utils.models.disabled_device import DisabledDevice
from utils.factory.database import Database

nmap_scan = Blueprint("nmap_scan", __name__)


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


def detect_pdu_type(hostname, ip, v2c="amd123"):
    """Detect PDU type via SNMP sysDescr query and return type + default OID."""
    try:
        # Query SNMPv2-MIB::sysDescr.0 (1.3.6.1.2.1.1.1.0)
        result = subprocess.run(
            ["snmpwalk", "-v2c", "-c", v2c, "-Oqv", ip, "1.3.6.1.2.1.1.1.0"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            print(f"SNMP query failed for {hostname} ({ip}): {result.stderr}")
            return {"type": "unknown", "default_oid": ""}
        
        sys_descr = result.stdout.strip().lower()
        print(f"PDU {hostname} sysDescr: {sys_descr}")
        
        # Match manufacturer in sysDescr
        if "tripp" in sys_descr or "tripplite" in sys_descr:
            return {
                "type": "tripplite",
                "default_oid": "1.3.6.1.4.1.850.1.2.1.1.4.0"
            }
        elif "enlogic" in sys_descr:
            return {
                "type": "enlogic",
                "default_oid": "1.3.6.1.4.1.38446.1.1.2.1.8.1.1"
            }
        else:
            return {
                "type": "unknown",
                "default_oid": "",
                "sys_descr": sys_descr[:100]  # Include first 100 chars for debugging
            }
    
    except Exception as e:
        print(f"Error detecting PDU type for {hostname}: {e}")
        return {"type": "unknown", "default_oid": ""}


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

    # Build lookups
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
    pdus_by_ip = {p.get("ip"): p for p in tracked_pdus if p.get("ip")}

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

    # Track which DB records were matched during this scan
    matched_system_ids = set()
    matched_pdu_names = set()
    matched_ips = set()

    # ----------------------------
    # Systems (BMC hostname logic)
    # ----------------------------
    for d in scanned_devices["systems"]:
        bmc_hostname = d["hostname"].lower()
        ip = d["ip"]

        matched_by_name = None
        for system_name, system_record in systems_by_name.items():
            if system_name in bmc_hostname:
                matched_by_name = system_record
                break

        if matched_by_name:
            # Matched by name — record as seen
            matched_system_ids.add(str(matched_by_name.get("_id")))
            matched_ips.add(ip)
            # Update last_seen in DB
            db = Database()
            db.update(matched_by_name.get("_id"), {"last_seen": datetime.now()}, "systems")
            old_ip = matched_by_name.get("bmc_ip")
            if old_ip and old_ip != ip:
                analysis["changed_system_ips"].append({
                    "hostname": matched_by_name.get("system"),
                    "old_ip": old_ip,
                    "new_ip": ip,
                    "_id": matched_by_name.get("_id")
                })
        elif ip in systems_by_ip:
            # IP matches but hostname doesn't — hostname changed
            matched_by_ip = systems_by_ip[ip]
            matched_system_ids.add(str(matched_by_ip.get("_id")))
            matched_ips.add(ip)
            db = Database()
            db.update(matched_by_ip.get("_id"), {"last_seen": datetime.now()}, "systems")
            analysis["changed_system_hostnames"].append({
                "ip": ip,
                "old_hostname": matched_by_ip.get("system"),
                "new_hostname": d["hostname"],
                "_id": matched_by_ip.get("_id")
            })
        else:
            # Neither name nor IP match — truly new
            analysis["new_systems"].append(d)

    # ----------------------------
    # Possible system resets
    # ----------------------------
    for d in scanned_devices["non_standard"] + scanned_devices["no_hostname"]:
        ip = d["ip"]
        if ip in systems_by_ip and ip not in matched_ips:
            s = systems_by_ip[ip]
            matched_system_ids.add(str(s.get("_id")))
            matched_ips.add(ip)
            analysis["possible_system_resets"].append({
                "ip": ip,
                "expected_hostname": s.get("system"),
                "current_hostname": d.get("hostname")
            })

    # ----------------------------
    # PDUs
    # ----------------------------
    matched_pdu_ids = set()

    for d in scanned_devices["pdus"]:
        hostname = d["hostname"]
        name = hostname.lower()
        ip = d["ip"]

        if name in pdus_by_name:
            pdu_record = pdus_by_name[name]
            matched_pdu_ids.add(str(pdu_record.get("_id")))
            db = Database()
            db.update(pdu_record.get("_id"), {"last_seen": datetime.now()}, "pdus")
        elif ip in pdus_by_ip:
            matched_pdu = pdus_by_ip[ip]
            matched_pdu_ids.add(str(matched_pdu.get("_id")))
            db = Database()
            db.update(matched_pdu.get("_id"), {"last_seen": datetime.now()}, "pdus")
            analysis["changed_pdu_hostnames"].append({
                "ip": ip,
                "old_hostname": matched_pdu.get("hostname"),
                "new_hostname": hostname,
                "_id": matched_pdu.get("_id")
            })
        else:
            # Add PDU type detection info via SNMP
            pdu_info = detect_pdu_type(hostname, ip)
            analysis["new_pdus"].append({
                **d,
                "pdu_type": pdu_info["type"],
                "default_oid": pdu_info["default_oid"],
                "sys_descr": pdu_info.get("sys_descr", "")
            })

    # ----------------------------
    # Not detected — in DB but not seen this scan
    # ----------------------------
    two_weeks_ago = datetime.now() - timedelta(weeks=2)

    for s in tracked_systems:
        sid = str(s.get("_id"))
        if sid not in matched_system_ids:
            last_seen = s.get("last_seen")
            analysis["not_detected_systems"].append({
                "_id": sid,
                "hostname": s.get("system"),
                "bmc_ip": s.get("bmc_ip"),
                "last_seen": last_seen.isoformat() if isinstance(last_seen, datetime) else last_seen,
                "overdue": last_seen is not None and last_seen < two_weeks_ago,
            })

    for p in tracked_pdus:
        pid = str(p.get("_id"))
        if pid not in matched_pdu_ids:
            last_seen = p.get("last_seen")
            analysis["not_detected_pdus"].append({
                "_id": pid,
                "hostname": p.get("hostname"),
                "last_seen": last_seen.isoformat() if isinstance(last_seen, datetime) else last_seen,
                "overdue": last_seen is not None and last_seen < two_weeks_ago,
            })

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
        
        # Use db directly - bmc_ip is not in the model's update_optional_fields
        db = Database()
        update_result = db.update(system_id, {"bmc_ip": new_ip}, "systems")
        
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


@nmap_scan.route("/update-hostname", methods=["POST"])
@require_admin_password
def update_hostname():
    """Update system or PDU hostname in the database"""
    try:
        data = request.json
        entity_id = data.get("entity_id")
        entity_type = data.get("entity_type")  # "system" or "pdu"
        old_hostname = data.get("old_hostname")
        new_hostname = data.get("new_hostname")
        ip = data.get("ip")
        admin_user = data.get("admin_user", "admin")

        if not all([entity_id, entity_type, old_hostname, new_hostname]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400

        db = Database()

        if entity_type == "system":
            # Extract clean system name from BMC hostname
            system_name = new_hostname.replace("bmc-", "").replace(".amd.com", "")
            db.update(entity_id, {"system": system_name}, "systems")
            entity_name = system_name
            collection = "systems"
        elif entity_type == "pdu":
            db.update(entity_id, {"hostname": new_hostname}, "pdus")
            entity_name = new_hostname
            collection = "pdus"
        else:
            return jsonify({"status": "error", "message": "Invalid entity_type"}), 400

        # Log the change
        change_log = ChangeLog()
        change_log.create({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "change_type": "hostname_update",
            "old_values": {"hostname": old_hostname},
            "new_values": {"hostname": new_hostname},
            "changed_by": admin_user,
            "created": datetime.now()
        })

        return jsonify({
            "status": "success",
            "message": f"Successfully updated {entity_type} hostname to {new_hostname}"
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
            "ignored_devices": serialize(ignored_devices)
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
            "change_logs": serialize(logs)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@nmap_scan.route("/disabled-devices", methods=["GET"])
def get_disabled_devices():
    """Get all devices in the disabled collection"""
    try:
        disabled_model = DisabledDevice()
        devices = disabled_model.find({}, sort=[("disabled_at", -1)])
        return jsonify({"status": "success", "disabled_devices": serialize(devices)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@nmap_scan.route("/move-to-disabled", methods=["POST"])
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


@nmap_scan.route("/restore-from-disabled", methods=["POST"])
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