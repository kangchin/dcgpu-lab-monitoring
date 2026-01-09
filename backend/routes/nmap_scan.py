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
    Only processes hosts that are actually up (not all 1536 IPs).
    
    Example nmap output:
    Nmap scan report for pdu-odcdh2-b01-1.amd.com (10.145.71.8)
    Host is up (0.00067s latency).
    
    Nmap scan report for 10.145.71.100
    Host is up (0.00050s latency).
    """
    devices = {
        "systems": [],
        "pdus": [],
        "non_standard": [],
        "no_hostname": []
    }
    
    print("DEBUG: Starting to parse nmap output...")
    print(f"DEBUG: Output length: {len(output)} characters")
    
    # Parse nmap output line by line
    lines = output.split('\n')
    print(f"DEBUG: Total lines: {len(lines)}")
    
    current_ip = None
    current_hostname = None
    host_is_up = False
    processed_count = 0
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Match lines with hostname and IP: "Nmap scan report for hostname.domain (10.145.71.1)"
        hostname_match = re.search(r'Nmap scan report for ([^\s]+) \((\d+\.\d+\.\d+\.\d+)\)', line)
        if hostname_match:
            # Process previous device if exists and was up
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
                processed_count += 1
            
            # New device with hostname
            current_hostname = hostname_match.group(1)
            current_ip = hostname_match.group(2)
            host_is_up = False
            #print(f"DEBUG: Found device with hostname: {current_hostname} ({current_ip})")
            continue
        
        # Match lines with only IP: "Nmap scan report for 10.145.71.1"
        ip_only_match = re.search(r'Nmap scan report for (\d+\.\d+\.\d+\.\d+)', line)
        if ip_only_match and not hostname_match:  # Make sure it's not already matched above
            # Process previous device if exists and was up
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
                processed_count += 1
            
            # New device without hostname
            current_ip = ip_only_match.group(1)
            current_hostname = None
            host_is_up = False
            #print(f"DEBUG: Found device without hostname: {current_ip}")
            continue
        
        # Check for "Host is up" to confirm device is reachable
        if "Host is up" in line and current_ip:
            host_is_up = True
            #print(f"DEBUG: Host is up: {current_ip}")
            continue
    
    # Process last device if it was up
    if current_ip and host_is_up:
        if current_hostname:
            categorize_device(devices, current_ip, current_hostname)
        else:
            devices["no_hostname"].append({
                "ip": current_ip,
                "hostname": None
            })
        processed_count += 1
    
    print(f"DEBUG: Processed {processed_count} hosts that were up")
    print(f"DEBUG: Systems: {len(devices['systems'])}, PDUs: {len(devices['pdus'])}, Non-standard: {len(devices['non_standard'])}, No hostname: {len(devices['no_hostname'])}")
    
    return devices

def categorize_device(devices, ip, hostname):
    """
    Categorize a device based on its hostname.
    - Systems: hostname contains "bmc" (case-insensitive)
    - PDUs: hostname contains "pdu" (case-insensitive)
    - Non-standard: has hostname but doesn't contain "bmc" or "pdu"
    """
    hostname_lower = hostname.lower() if hostname else ""
    
    device_info = {"ip": ip, "hostname": hostname}
    
    if "bmc" in hostname_lower:
        devices["systems"].append(device_info)
        print(f"DEBUG: Categorized as SYSTEM: {hostname}")
    elif "pdu" in hostname_lower:
        devices["pdus"].append(device_info)
        print(f"DEBUG: Categorized as PDU: {hostname}")
    else:
        # Has hostname but doesn't contain "bmc" or "pdu"
        devices["non_standard"].append(device_info)
        print(f"DEBUG: Categorized as NON-STANDARD: {hostname}")

def compare_with_database(scanned_devices):
    """
    Compare scanned devices with database records.
    Returns analysis of new devices, changed IPs, and possible resets.
    """
    print("DEBUG: Starting database comparison...")
    
    # Fetch tracked systems and PDUs from database
    systems_model = Systems()
    pdu_model = Pdu()
    
    tracked_systems = systems_model.find({})
    tracked_pdus = pdu_model.find({})
    
    print(f"DEBUG: Found {len(tracked_systems)} tracked systems in database")
    print(f"DEBUG: Found {len(tracked_pdus)} tracked PDUs in database")
    
    # Create lookup dictionaries
    systems_by_hostname = {s.get("system", "").lower(): s for s in tracked_systems}
    systems_by_ip = {s.get("bmc_ip", ""): s for s in tracked_systems if s.get("bmc_ip")}
    
    pdus_by_hostname = {p.get("hostname", "").lower(): p for p in tracked_pdus}
    pdus_by_ip = {p.get("hostname", ""): p for p in tracked_pdus}
    
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
            print(f"DEBUG: NEW SYSTEM found: {hostname}")
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
                print(f"DEBUG: SYSTEM IP CHANGED: {hostname} from {tracked_ip} to {ip}")
    
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
            print(f"DEBUG: POSSIBLE SYSTEM RESET: {ip} has hostname {device['hostname']}, expected {tracked_system.get('system')}")
    
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
            print(f"DEBUG: POSSIBLE SYSTEM RESET: {ip} has no hostname, expected {tracked_system.get('system')}")
    
    # Analyze PDUs
    for device in scanned_devices["pdus"]:
        hostname = device["hostname"].lower()
        ip = device["ip"]
        
        # Check if hostname exists in database
        if hostname not in pdus_by_hostname:
            # New PDU (hostname not in database)
            analysis["new_pdus"].append(device)
            print(f"DEBUG: NEW PDU found: {hostname}")
    
    print(f"DEBUG: Analysis complete - New systems: {len(analysis['new_systems'])}, New PDUs: {len(analysis['new_pdus'])}")
    
    return analysis

@nmap_scan.route("/scan", methods=["POST"])
def run_nmap_scan():
    """
    Execute nmap scan and return categorized results with database comparison.
    """
    try:
        print("="*60)
        print("NMAP SCAN STARTED")
        print("="*60)
        
        # Check if nmap is available first
        try:
            check_result = subprocess.run(
                ["which", "nmap"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if check_result.returncode != 0:
                print("ERROR: nmap command not found in system PATH")
                return jsonify({
                    "status": "error",
                    "message": "Nmap is not installed on the server. Please install nmap package."
                }), 500
        except Exception as e:
            print(f"ERROR: Could not check for nmap: {e}")
            return jsonify({
                "status": "error",
                "message": f"Could not verify nmap installation: {str(e)}"
            }), 500
        
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
        print("This may take several minutes...")
        
        # Execute nmap with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if "Host discovery disabled" in result.stderr:
            print("WARNING: Nmap running without raw socket access")
        print(result)
        print(f"Nmap exit code: {result.returncode}")
        
        if result.returncode != 0:
            print(f"STDERR: {result.stderr}")
            return jsonify({
                "status": "error",
                "message": f"Nmap command failed with exit code {result.returncode}: {result.stderr}"
            }), 500
        
        print("Nmap scan completed successfully")
        print(f"Output length: {len(result.stdout)} characters")
        
        # Parse nmap output
        print("Parsing nmap output...")
        try:
            scanned_devices = parse_nmap_output(result.stdout)
            
            print(f"Parsing complete:")
            print(f"  - Systems (BMC): {len(scanned_devices['systems'])}")
            print(f"  - PDUs: {len(scanned_devices['pdus'])}")
            print(f"  - Non-standard: {len(scanned_devices['non_standard'])}")
            print(f"  - No hostname: {len(scanned_devices['no_hostname'])}")
            
            # Print sample devices from each category for debugging
            if scanned_devices['systems']:
                print(f"  Sample system: {scanned_devices['systems'][0]}")
            if scanned_devices['pdus']:
                print(f"  Sample PDU: {scanned_devices['pdus'][0]}")
            if scanned_devices['non_standard']:
                print(f"  Sample non-standard: {scanned_devices['non_standard'][0]}")
            if scanned_devices['no_hostname']:
                print(f"  Sample no hostname: {scanned_devices['no_hostname'][0]}")
            
        except Exception as e:
            print(f"ERROR parsing nmap output: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "status": "error",
                "message": f"Failed to parse nmap output: {str(e)}"
            }), 500
        
        # Compare with database
        print("Comparing with database...")
        try:
            analysis = compare_with_database(scanned_devices)
            print("Database comparison complete")
            
        except Exception as e:
            print(f"ERROR comparing with database: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "status": "error",
                "message": f"Failed to compare with database: {str(e)}"
            }), 500
        
        print("="*60)
        print("NMAP SCAN COMPLETED SUCCESSFULLY")
        print("="*60)
        
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
        print("ERROR: Nmap scan timed out")
        return jsonify({
            "status": "error",
            "message": "Nmap scan timed out after 5 minutes"
        }), 500
    except FileNotFoundError as e:
        print(f"ERROR: Command not found - {e}")
        return jsonify({
            "status": "error", 
            "message": "Nmap command not found. Please install nmap package."
        }), 500
    except Exception as e:
        print(f"UNEXPECTED ERROR in nmap scan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
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