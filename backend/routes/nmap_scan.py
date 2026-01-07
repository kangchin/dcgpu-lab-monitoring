# backend/routes/nmap_scan.py
import re
import subprocess
from flask import Blueprint, jsonify
from utils.models.systems import Systems
from utils.models.pdu import Pdu

nmap_scan = Blueprint("nmap_scan", __name__)

def parse_nmap_output(output):
    """
    Parse nmap output and categorize devices.
    Returns dict with categorized devices.
    """
    devices = {
        "systems": [],
        "pdus": [],
        "non_standard": [],
        "no_hostname": []
    }
    
    # Parse nmap output line by line
    lines = output.split('\n')
    current_ip = None
    current_hostname = None
    host_is_up = False
    
    for line in lines:
        # Match lines with hostname and IP: "Nmap scan report for hostname.domain (10.145.71.1)"
        hostname_match = re.search(r'Nmap scan report for ([^\s]+) \((\d+\.\d+\.\d+\.\d+)\)', line)
        if hostname_match:
            # Process previous device if exists
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
            
            # New device with hostname
            current_hostname = hostname_match.group(1)
            current_ip = hostname_match.group(2)
            host_is_up = False
            continue
        
        # Match lines with only IP: "Nmap scan report for 10.145.71.1"
        ip_match = re.search(r'Nmap scan report for (\d+\.\d+\.\d+\.\d+)', line)
        if ip_match:
            # Process previous device if exists
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
            
            # New device without hostname
            current_ip = ip_match.group(1)
            current_hostname = None
            host_is_up = False
            continue
        
        # Check for "Host is up" to confirm device is reachable
        if "Host is up" in line:
            host_is_up = True
            continue
    
    # Process last device
    if current_ip and host_is_up:
        if current_hostname:
            categorize_device(devices, current_ip, current_hostname)
        else:
            devices["no_hostname"].append({
                "ip": current_ip,
                "hostname": None
            })
    
    return devices

def categorize_device(devices, ip, hostname):
    """Categorize a device based on its hostname."""
    hostname_lower = hostname.lower() if hostname else ""
    
    device_info = {"ip": ip, "hostname": hostname}
    
    if hostname_lower.startswith("bmc-"):
        devices["systems"].append(device_info)
    elif hostname_lower.startswith("pdu-"):
        devices["pdus"].append(device_info)
    else:
        devices["non_standard"].append(device_info)

def compare_with_database(scanned_devices):
    """
    Compare scanned devices with database records.
    Returns analysis of new devices, changed IPs, and possible resets.
    """
    # Fetch tracked systems and PDUs from database
    systems_model = Systems()
    pdu_model = Pdu()
    
    tracked_systems = systems_model.find({})
    tracked_pdus = pdu_model.find({})
    
    # Create lookup dictionaries
    systems_by_hostname = {s.get("system", "").lower(): s for s in tracked_systems}
    systems_by_ip = {s.get("bmc_ip", ""): s for s in tracked_systems if s.get("bmc_ip")}
    
    pdus_by_hostname = {p.get("hostname", "").lower(): p for p in tracked_pdus}
    pdus_by_ip = {p.get("hostname", ""): p for p in tracked_pdus}  # PDU uses hostname field for IP in some cases
    
    analysis = {
        "new_systems": [],
        "new_pdus": [],
        "changed_system_ips": [],
        "changed_pdu_ips": [],
        "possible_system_resets": [],
        "possible_pdu_resets": []
    }
    
    # Analyze systems
    for device in scanned_devices["systems"]:
        hostname = device["hostname"].lower()
        ip = device["ip"]
        
        # Check if hostname exists in database
        if hostname not in systems_by_hostname:
            # New system (hostname not in database)
            analysis["new_systems"].append(device)
        else:
            # Known system - check if IP changed
            tracked_system = systems_by_hostname[hostname]
            tracked_ip = tracked_system.get("bmc_ip", "")
            
            if tracked_ip and tracked_ip != ip:
                analysis["changed_system_ips"].append({
                    "hostname": hostname,
                    "old_ip": tracked_ip,
                    "new_ip": ip,
                    "system_data": tracked_system
                })
    
    # Check for possible system resets (non-standard hostname with tracked IP)
    for device in scanned_devices["non_standard"]:
        ip = device["ip"]
        if ip in systems_by_ip:
            tracked_system = systems_by_ip[ip]
            analysis["possible_system_resets"].append({
                "current_hostname": device["hostname"],
                "ip": ip,
                "expected_hostname": tracked_system.get("system"),
                "system_data": tracked_system
            })
    
    # Check no_hostname devices for tracked IPs
    for device in scanned_devices["no_hostname"]:
        ip = device["ip"]
        if ip in systems_by_ip:
            tracked_system = systems_by_ip[ip]
            analysis["possible_system_resets"].append({
                "current_hostname": None,
                "ip": ip,
                "expected_hostname": tracked_system.get("system"),
                "system_data": tracked_system
            })
    
    # Analyze PDUs
    for device in scanned_devices["pdus"]:
        hostname = device["hostname"].lower()
        ip = device["ip"]
        
        # Check if hostname exists in database
        if hostname not in pdus_by_hostname:
            # New PDU (hostname not in database)
            analysis["new_pdus"].append(device)
        else:
            # Known PDU - check if IP changed
            tracked_pdu = pdus_by_hostname[hostname]
            # PDUs might store IP in hostname field or have it embedded
            # Extract IP from hostname if it follows pattern
            tracked_hostname = tracked_pdu.get("hostname", "")
            
            # Try to resolve tracked PDU IP (might need DNS lookup or stored field)
            # For now, we'll skip IP change detection for PDUs if not directly stored
            # You can enhance this based on your PDU data structure
    
    # Check for possible PDU resets
    for device in scanned_devices["non_standard"]:
        hostname_lower = device["hostname"].lower()
        # Check if this might be a reset PDU (has pdu-like IP or was previously tracked)
        # This is a heuristic - you may need to adjust based on your network
        if any(pdu_hostname in hostname_lower for pdu_hostname in pdus_by_hostname.keys()):
            analysis["possible_pdu_resets"].append({
                "current_hostname": device["hostname"],
                "ip": device["ip"],
                "note": "Non-standard hostname but may be related to tracked PDU"
            })
    
    return analysis

@nmap_scan.route("/scan", methods=["POST"])
def run_nmap_scan():
    """
    Execute nmap scan and return categorized results with database comparison.
    """
    try:
        print("Starting nmap scan...")
        
        # Define network ranges to scan
        networks = [
            "10.145.71.0/24",
            "10.145.70.0/24", 
            "10.145.69.0/24",
            "10.145.132.0/24",
            "10.145.133.0/24",
            "10.145.135.0/24"
        ]
        
        # Build nmap command
        cmd = ["nmap", "-sn"] + networks
        
        print(f"Executing: {' '.join(cmd)}")
        
        # Execute nmap with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            return jsonify({
                "status": "error",
                "message": f"Nmap command failed: {result.stderr}"
            }), 500
        
        print("Nmap scan completed, parsing output...")
        
        # Parse nmap output
        scanned_devices = parse_nmap_output(result.stdout)
        
        print(f"Found {len(scanned_devices['systems'])} systems, "
              f"{len(scanned_devices['pdus'])} PDUs, "
              f"{len(scanned_devices['non_standard'])} non-standard, "
              f"{len(scanned_devices['no_hostname'])} no hostname")
        
        # Compare with database
        print("Comparing with database...")
        analysis = compare_with_database(scanned_devices)
        
        return jsonify({
            "status": "success",
            "scanned_devices": scanned_devices,
            "analysis": analysis,
            "summary": {
                "total_devices": sum(len(v) for v in scanned_devices.values()),
                "systems": len(scanned_devices["systems"]),
                "pdus": len(scanned_devices["pdus"]),
                "non_standard": len(scanned_devices["non_standard"]),
                "no_hostname": len(scanned_devices["no_hostname"]),
                "new_systems": len(analysis["new_systems"]),
                "new_pdus": len(analysis["new_pdus"]),
                "changed_ips": len(analysis["changed_system_ips"]) + len(analysis["changed_pdu_ips"]),
                "possible_resets": len(analysis["possible_system_resets"]) + len(analysis["possible_pdu_resets"])
            }
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "Nmap scan timed out after 5 minutes"
        }), 500
    except FileNotFoundError:
        return jsonify({
            "status": "error", 
            "message": "Nmap command not found. Please install nmap package."
        }), 500
    except Exception as e:
        print(f"Error in nmap scan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@nmap_scan.route("/scan/status", methods=["GET"])
def scan_status():
    """Check if nmap is available on the system."""
    try:
        result = subprocess.run(
            ["nmap", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            return jsonify({
                "status": "available",
                "version": version_line
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Nmap returned error"
            }), 500
            
    except FileNotFoundError:
        return jsonify({
            "status": "unavailable",
            "message": "Nmap is not installed"
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500