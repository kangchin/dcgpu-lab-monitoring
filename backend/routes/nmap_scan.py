# backend/routes/nmap_scan.py
import re
import subprocess
import platform
import os
import requests

from flask import Blueprint, jsonify
from utils.models.systems import Systems
from utils.models.pdu import PDU

nmap_scan = Blueprint("nmap_scan", __name__)


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
                    "new_ip": ip
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
    # PDUs (unchanged)
    # ----------------------------
    for d in scanned_devices["pdus"]:
        name = d["hostname"].lower()
        if name not in pdus_by_name:
            analysis["new_pdus"].append(d)

    return analysis

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
