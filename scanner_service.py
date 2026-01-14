# scanner-service/scanner_service.py
"""
Windows Host Scanner Service
Runs on Windows host (outside Docker) and provides nmap scanning via HTTP API.
"""

import subprocess
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
import platform

app = Flask(__name__)
CORS(app)  # Allow requests from Docker containers

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
    
    lines = output.split('\n')
    current_ip = None
    current_hostname = None
    host_is_up = False
    
    for line in lines:
        # Match lines with hostname and IP
        hostname_match = re.search(r'Nmap scan report for ([^\s]+) \((\d+\.\d+\.\d+\.\d+)\)', line)
        if hostname_match:
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
            
            current_hostname = hostname_match.group(1)
            current_ip = hostname_match.group(2)
            host_is_up = False
            continue
        
        # Match lines with only IP
        ip_match = re.search(r'Nmap scan report for (\d+\.\d+\.\d+\.\d+)$', line)
        if ip_match:
            if current_ip and host_is_up:
                if current_hostname:
                    categorize_device(devices, current_ip, current_hostname)
                else:
                    devices["no_hostname"].append({
                        "ip": current_ip,
                        "hostname": None
                    })
            
            current_ip = ip_match.group(1)
            current_hostname = None
            host_is_up = False
            continue
        
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
    
    if "bmc" in hostname_lower:
        devices["systems"].append(device_info)
    elif "pdu" in hostname_lower:
        devices["pdus"].append(device_info)
    else:
        devices["non_standard"].append(device_info)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "platform": platform.system()})

@app.route('/scan', methods=['POST'])
def run_scan():
    """Execute nmap scan on the host system."""
    try:
        print("Received scan request...")
        
        # Get networks from request or use defaults
        data = request.get_json() or {}
        networks = data.get('networks', [
            "10.145.71.0/24",
            "10.145.70.0/24", 
            "10.145.69.0/24",
            "10.145.132.0/24",
            "10.145.133.0/24",
            "10.145.135.0/24"
        ])
        
        print(f"Scanning networks: {networks}")
        
        # Build nmap command
        cmd = ["nmap", "-sn", "-R"] + networks
        
        print(f"Executing: {' '.join(cmd)}")
        
        # Execute nmap with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            print(f"Nmap error: {result.stderr}")
            return jsonify({
                "status": "error",
                "message": f"Nmap command failed: {result.stderr}"
            }), 500
        
        print("Nmap scan completed, parsing output...")
        
        # Parse output
        scanned_devices = parse_nmap_output(result.stdout)
        
        print(f"Found {len(scanned_devices['systems'])} systems, "
              f"{len(scanned_devices['pdus'])} PDUs, "
              f"{len(scanned_devices['non_standard'])} non-standard, "
              f"{len(scanned_devices['no_hostname'])} no hostname")
        
        return jsonify({
            "status": "success",
            "scanned_devices": scanned_devices,
            "raw_output": result.stdout  # Include for debugging
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "Nmap scan timed out after 5 minutes"
        }), 500
    except FileNotFoundError:
        return jsonify({
            "status": "error",
            "message": "Nmap command not found. Please ensure nmap is installed and in PATH."
        }), 500
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/status', methods=['GET'])
def check_status():
    """Check if nmap is available."""
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
                "version": version_line,
                "platform": platform.system()
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Nmap returned error"
            }), 500
            
    except FileNotFoundError:
        return jsonify({
            "status": "unavailable",
            "message": "Nmap is not installed or not in PATH"
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 70)
    print("Network Scanner Service (Windows Host)")
    print("=" * 70)
    print(f"Platform: {platform.system()}")
    print("Starting on http://localhost:5001")
    print("=" * 70)
    print("")
    
    # Run on port 5001 to avoid conflict with backend
    app.run(host='0.0.0.0', port=5001, debug=False)