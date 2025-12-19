import os
import json
import redis
import asyncio
import subprocess
import re
import requests
import paramiko
from datetime import datetime
from celery import shared_task
from utils.models.pdu import PDU
from utils.models.power import Power
from utils.models.temperature import Temperature
from utils.models.systems import Systems
from utils.metrics import SYSTEM_GPU_TEMP_GAUGE, POWER_GAUGE, TEMP_GAUGE, SYSTEM_FAN_SPEED
from puresnmp import Client, V2C, ObjectIdentifier as OID
from dotenv import load_dotenv
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Import SystemTemperature model with error handling
try:
    from utils.models.system_temperature import SystemTemperature
    print("SystemTemperature model imported successfully")
except ImportError as e:
    print(f"Failed to import SystemTemperature model: {e}")
    SystemTemperature = None

# Ensure .env file is loaded in tasks
load_dotenv()


@shared_task
def say_hello():
    print("Hello from Celery!")


async def snmpFetch(pdu_hostname: str, oid: str, v2c: str, type: str):
    try:
        client = Client(pdu_hostname, V2C(v2c))
        # Retrieve SNMP value
        data = await client.get(OID(oid))
        if not data:
            return None
        if type == "temp":
            # many SNMP temp sensors report tenths of degree
            return float(data.value / 10)
        else:
            return int(data.value)
    except Exception as e:
        print(f"snmpFetch error for {pdu_hostname} oid {oid}: {e}")
        return None


def determine_system_type(system_name: str):
    """
    Determine system type based on system name prefix.
    Returns: 'smci', 'miramar', 'gbt', 'quanta', 'banff', or 'unknown'
    """
    system_name_lower = (system_name or "").lower()
    if system_name_lower.startswith("smci"):
        return "smci"
    elif system_name_lower.startswith("miramar"):
        return "miramar"
    elif system_name_lower.startswith("gbt"):
        return "gbt"
    elif system_name_lower.startswith("quanta"):
        return "quanta"
    elif system_name_lower.startswith("banff"):
        return "banff"
    elif system_name_lower.startswith("dell"):
        return "dell"
    elif system_name_lower.startswith("gt"):
        return "gt"
    else:
        return "unknown"

def fetch_gpu_temperatures_dell_ssh(bmc_ip: str, username: str, password: str, system_name: str):
    """
    Fetch GPU temperatures for Dell systems via SSH.
    Requires running 'racadm debug invoke rootshellash' first, then using curl
    to query the local Redfish endpoint for each GPU's temperature.
    Uses an interactive shell to maintain the root shell context.
    Returns a list of 8 temperatures (indexed 0-7) or None if failed.
    """
    import time
    
    try:
        print(f"[DELL DEBUG] Attempting Dell SSH connection to {bmc_ip}")

        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # Connect with timeout
        print(f"[DELL DEBUG] Connecting to {bmc_ip} with username: {username}")
        ssh.connect(
            bmc_ip,
            username=username,
            password=password,
            timeout=30,
            look_for_keys=False,
            allow_agent=False
        )
        print(f"[DELL DEBUG] Successfully connected to {bmc_ip}")

        # Open an interactive shell session
        print(f"[DELL DEBUG] Opening interactive shell")
        shell = ssh.invoke_shell()
        shell.settimeout(30)
        
        # Wait for initial prompt
        print(f"[DELL DEBUG] Waiting for initial prompt (2 seconds)...")
        time.sleep(2)
        
        # Clear any initial output
        initial_output = ""
        if shell.recv_ready():
            initial_output = shell.recv(65535).decode('utf-8', errors='ignore')
            print(f"[DELL DEBUG] Initial output received ({len(initial_output)} chars): {initial_output[:500]}")
        else:
            print(f"[DELL DEBUG] No initial output ready")

        # Invoke the root shell
        print(f"[DELL DEBUG] Sending racadm command: 'racadm debug invoke rootshellash'")
        shell.send("racadm debug invoke rootshellash\n")
        
        print(f"[DELL DEBUG] Waiting for root shell to initialize (5 seconds as configured)...")
        time.sleep(5)
        
        # Read the output from racadm command
        racadm_output = ""
        if shell.recv_ready():
            racadm_output = shell.recv(65535).decode('utf-8', errors='ignore')
            print(f"[DELL DEBUG] Root shell response ({len(racadm_output)} chars):")
            print(f"[DELL DEBUG] ===== START RACADM OUTPUT =====")
            print(racadm_output)
            print(f"[DELL DEBUG] ===== END RACADM OUTPUT =====")
        else:
            print(f"[DELL DEBUG] WARNING: No output ready after racadm command")

        # Test if shell is responsive
        print(f"[DELL DEBUG] Testing shell responsiveness with 'echo test'")
        shell.send("echo test\n")
        time.sleep(1)
        test_output = ""
        if shell.recv_ready():
            test_output = shell.recv(65535).decode('utf-8', errors='ignore')
            print(f"[DELL DEBUG] Echo test response: {test_output}")
        else:
            print(f"[DELL DEBUG] WARNING: No response to echo test")

        gpu_temps = [None] * 8

        # Query each GPU temperature (OAM_0 through OAM_7)
        for gpu_num in range(8):
            try:
                print(f"[DELL DEBUG] === Processing GPU {gpu_num} ===")
                
                # First, try to test if curl is available
                if gpu_num == 0:  # Only test once
                    print(f"[DELL DEBUG] Testing curl availability")
                    shell.send("which curl\n")
                    time.sleep(1)
                    which_output = ""
                    if shell.recv_ready():
                        which_output = shell.recv(65535).decode('utf-8', errors='ignore')
                        print(f"[DELL DEBUG] 'which curl' output: {which_output}")
                
                # Build the curl command to query the local Redfish endpoint
                marker = f"GPU{gpu_num}TEMP"
                curl_cmd = (
                    f"curl -s http://192.168.31.1/redfish/v1/Chassis/OAM_{gpu_num}/ThermalSubsystem/ThermalMetrics 2>/dev/null | "
                    f"awk '/GPU_{gpu_num}_DIE_TEMP/{{f=1}} f && /ReadingCelsius/{{print \"{marker}:\" $2; exit}}'\n"
                )
                
                print(f"[DELL DEBUG] Sending command: {curl_cmd.strip()}")
                shell.send(curl_cmd)
                
                print(f"[DELL DEBUG] Waiting 2 seconds for curl to complete...")
                time.sleep(2)
                
                # Read the output
                output = ""
                if shell.recv_ready():
                    output = shell.recv(65535).decode('utf-8', errors='ignore')
                    print(f"[DELL DEBUG] GPU {gpu_num} raw output ({len(output)} chars):")
                    print(f"[DELL DEBUG] ----- START OUTPUT -----")
                    print(output)
                    print(f"[DELL DEBUG] ----- END OUTPUT -----")
                else:
                    print(f"[DELL DEBUG] WARNING: No output ready for GPU {gpu_num}")
                
                # Parse the output looking for our marker
                if marker in output:
                    print(f"[DELL DEBUG] Found marker '{marker}' in output")
                    for line in output.split("\n"):
                        line = line.strip()

                        # Only accept real output lines, not echoed commands
                        if not line.startswith(f"{marker}:"):
                            continue

                        print(f"[DELL DEBUG] Marker line: {line}")

                        try:
                            temp_str = line.split(":", 1)[1].strip()
                            temp = float(temp_str)
                            gpu_temps[gpu_num] = temp
                            print(f"[DELL DEBUG] Successfully parsed GPU_{gpu_num}: {temp}°C")
                        except Exception as e:
                            print(f"[DELL DEBUG] Parse error for GPU_{gpu_num}: {e}, line: {line}")
                        break

                else:
                    print(f"[DELL DEBUG] Marker '{marker}' NOT found in output, trying alternative parsing...")
                    
                    # Try alternative parsing - look for ReadingCelsius in raw output
                    if "ReadingCelsius" in output:
                        print(f"[DELL DEBUG] Found 'ReadingCelsius' in output, attempting regex parse")
                        pattern = rf'GPU_{gpu_num}_DIE_TEMP.*?ReadingCelsius["\s:]+(\d+\.?\d*)'
                        match = re.search(pattern, output, re.DOTALL)
                        if match:
                            try:
                                temp = float(match.group(1))
                                gpu_temps[gpu_num] = temp
                                print(f"[DELL DEBUG] Successfully parsed GPU_{gpu_num} via regex: {temp}°C")
                            except ValueError as e:
                                print(f"[DELL DEBUG] Regex parse error for GPU_{gpu_num}: {e}")
                        else:
                            print(f"[DELL DEBUG] Regex pattern did not match for GPU_{gpu_num}")
                    else:
                        print(f"[DELL DEBUG] 'ReadingCelsius' NOT found in output for GPU_{gpu_num}")
                        
                        # Try direct curl to see raw JSON
                        if gpu_num == 0:  # Only do this once for debugging
                            print(f"[DELL DEBUG] Attempting direct curl to see raw JSON response...")
                            direct_curl = f"curl -s http://192.168.31.1/redfish/v1/Chassis/OAM_{gpu_num}/ThermalSubsystem/ThermalMetrics\n"
                            shell.send(direct_curl)
                            time.sleep(3)
                            if shell.recv_ready():
                                raw_json = shell.recv(65535).decode('utf-8', errors='ignore')
                                print(f"[DELL DEBUG] Raw JSON response:")
                                print(f"[DELL DEBUG] ----- START RAW JSON -----")
                                print(raw_json[:1000])  # First 1000 chars
                                print(f"[DELL DEBUG] ----- END RAW JSON -----")

            except Exception as e:
                print(f"[DELL DEBUG] Exception fetching GPU_{gpu_num}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # Close the shell and SSH connection
        print(f"[DELL DEBUG] Closing SSH connection")
        shell.close()
        ssh.close()

        valid_temps = [t for t in gpu_temps if t is not None]
        print(f"[DELL DEBUG] Final results: {len(valid_temps)}/8 valid temperatures")
        print(f"[DELL DEBUG] GPU temps array: {gpu_temps}")
        
        if len(valid_temps) == 0:
            print(f"[DELL DEBUG] FAILURE: No valid GPU temperatures found for Dell system {bmc_ip}")
            return None

        print(f"[DELL DEBUG] SUCCESS: Retrieved {len(valid_temps)}/8 GPU temperatures from Dell {bmc_ip}")
        return gpu_temps

    except paramiko.AuthenticationException:
        print(f"[DELL DEBUG] ERROR: SSH authentication failed for {bmc_ip}")
        return None
    except paramiko.SSHException as e:
        print(f"[DELL DEBUG] ERROR: SSH connection error for {bmc_ip}: {e}")
        return None
    except Exception as e:
        print(f"[DELL DEBUG] ERROR: Unexpected error fetching Dell temperatures from {bmc_ip}: {e}")
        import traceback
        traceback.print_exc()
        return None

def fetch_gpu_temperatures_banff_ssh(rack_manager_ip: str, username: str, password: str, system_name: str):
    """
    Fetch GPU temperatures for Banff systems via SSH to rack manager.
    Uses paramiko to SSH and execute 'set sys cmd -i <rack_id> -c sdr' command.
    The rack_id is extracted from the last number of the system name.
    Returns a list of 8 temperatures (indexed 0-7) or None if failed.
    """
    try:
        print(f"Attempting Banff SSH connection to {rack_manager_ip}")

        # Extract rack ID from last number of system name
        match = re.search(r'(\d+)$', system_name)
        if not match:
            print(f"Could not extract rack ID from system name: {system_name}")
            return None
        rack_id = int(match.group(1))
        print(f"Using rack ID {rack_id} for system {system_name}")

        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # Connect with timeout
        ssh.connect(
            rack_manager_ip,
            username=username,
            password=password,
            timeout=30,
            look_for_keys=False,
            allow_agent=False
        )

        # Execute the command with dynamic rack ID
        command = f"set sys cmd -i {rack_id} -c sdr"
        stdin, stdout, stderr = ssh.exec_command(command, timeout=30)

        # Read output
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')

        ssh.close()

        if error:
            print(f"SSH command error for {rack_manager_ip}: {error}")

        if not output:
            print(f"No output from SSH command for {rack_manager_ip}")
            return None

        # Parse the output for GPU temperatures
        gpu_temps = [None] * 8

        # Look for GPU temperature lines in the format:
        # GPU_X_DIE_TEMP | XX degrees C | ok
        for line in output.split('\n'):
            for gpu_num in range(8):
                pattern = f"GPU_{gpu_num}_DIE_TEMP"
                if pattern in line:
                    match = re.search(r'(\d+(?:\.\d+)?)\s*degrees?\s*C', line, re.IGNORECASE)
                    if match:
                        try:
                            temp = float(match.group(1))
                            gpu_temps[gpu_num] = temp
                            print(f"  Found GPU_{gpu_num}_DIE_TEMP: {temp}°C")
                        except ValueError:
                            print(f"  Could not parse temperature for GPU_{gpu_num}: {match.group(1)}")
                    break

        valid_temps = [t for t in gpu_temps if t is not None]
        if len(valid_temps) == 0:
            print(f"No valid GPU temperatures found in output for {rack_manager_ip}")
            print(f"Raw output (first 500 chars): {output[:500]}")
            return None

        print(f"Successfully retrieved {len(valid_temps)}/8 GPU temperatures from {rack_manager_ip}")
        return gpu_temps

    except paramiko.AuthenticationException:
        print(f"SSH authentication failed for {rack_manager_ip}")
        return None
    except paramiko.SSHException as e:
        print(f"SSH connection error for {rack_manager_ip}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error fetching Banff temperatures from {rack_manager_ip}: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_gpu_temperatures_redfish(bmc_ip: str, username: str, password: str, system_type: str):
    """
    Fetch GPU temperatures for all 8 GPUs using Redfish API with retry logic.
    Returns a list of 8 temperatures (indexed 0-7) or None if failed.
    """

    def attempt_fetch():
        """Single attempt to fetch GPU temperatures"""
        try:
            if system_type == "smci":
                # SMCI: GPUs numbered 1-8
                url = f"https://{bmc_ip}/redfish/v1/Chassis/1/Thermal"
                response = requests.get(url, auth=(username, password), verify=False, timeout=30)
                if response.status_code != 200:
                    print(f"SMCI request failed for {bmc_ip}: HTTP {response.status_code}")
                    return None

                try:
                    thermal_data = response.json()
                except json.JSONDecodeError as e:
                    print(f"SMCI JSON decode error for {bmc_ip}: {e}")
                    return None

                gpu_temps = [None] * 8
                for temp_sensor in thermal_data.get("Temperatures", []):
                    if temp_sensor.get("Name") == "UBB GPU Temp":
                        oem_details = temp_sensor.get("Oem", {}).get("Supermicro", {}).get("Details", {})
                        for gpu_num in range(1, 9):
                            gpu_key = f"UBB GPU {gpu_num} Temp"
                            if gpu_key in oem_details:
                                try:
                                    gpu_temps[gpu_num - 1] = float(oem_details[gpu_key])
                                except (ValueError, TypeError):
                                    gpu_temps[gpu_num - 1] = None
                        break
                return gpu_temps

            elif system_type == "miramar":
                # Miramar: GPUs numbered 0-7
                url = f"https://{bmc_ip}/redfish/v1/Chassis/Miramar_Sensor/Thermal"
                response = requests.get(url, auth=(username, password), verify=False, timeout=30)
                if response.status_code != 200:
                    print(f"Miramar request failed for {bmc_ip}: HTTP {response.status_code}")
                    return None

                try:
                    thermal_data = response.json()
                except json.JSONDecodeError as e:
                    print(f"Miramar JSON decode error for {bmc_ip}: {e}")
                    return None

                gpu_temps = [None] * 8
                for temp_sensor in thermal_data.get("Temperatures", []):
                    member_id = temp_sensor.get("MemberId", "")
                    if member_id.startswith("TEMP_MI300_GPU"):
                        try:
                            gpu_num = int(member_id.replace("TEMP_MI300_GPU", ""))
                            if 0 <= gpu_num <= 7:
                                reading = temp_sensor.get("ReadingCelsius")
                                if reading is not None and 0 <= reading <= 200:
                                    gpu_temps[gpu_num] = float(reading)
                        except ValueError:
                            continue
                return gpu_temps

            elif system_type == "gbt":
                # Gigabyte: GPUs numbered 0-7
                url = f"https://{bmc_ip}/redfish/v1/Chassis/1/Thermal"
                response = requests.get(url, auth=(username, password), verify=False, timeout=30)
                if response.status_code != 200:
                    print(f"Gigabyte request failed for {bmc_ip}: HTTP {response.status_code}")
                    return None

                try:
                    thermal_data = response.json()
                except json.JSONDecodeError as e:
                    print(f"Gigabyte JSON decode error for {bmc_ip}: {e}")
                    return None

                gpu_temps = [None] * 8
                for temp_sensor in thermal_data.get("Temperatures", []):
                    name = temp_sensor.get("Name", "")
                    if name.startswith("GPU_") and name.endswith("_DIE_TEMP"):
                        try:
                            gpu_num = int(name.split("_")[1])
                            if 0 <= gpu_num <= 7:
                                reading = temp_sensor.get("ReadingCelsius")
                                if reading is not None and 0 <= reading <= 200:
                                    gpu_temps[gpu_num] = float(reading)
                        except (ValueError, IndexError):
                            continue
                return gpu_temps

            elif system_type == "quanta":
                # Quanta: GPUs numbered 0-7, individual chassis/sensor per GPU
                gpu_temps = [None] * 8
                for gpu_num in range(8):
                    try:
                        url = f"https://{bmc_ip}/redfish/v1/Chassis/GPU_{gpu_num}/Sensors/GPU_{gpu_num}_Temp_0"
                        response = requests.get(url, auth=(username, password), verify=False, timeout=10)
                        if response.status_code == 200:
                            try:
                                sensor_data = response.json()
                            except json.JSONDecodeError:
                                print(f"Quanta GPU_{gpu_num} JSON decode error for {bmc_ip}")
                                continue
                            reading = sensor_data.get("Reading")
                            if reading is not None and 0 <= reading <= 200:
                                try:
                                    gpu_temps[gpu_num] = float(reading)
                                except (ValueError, TypeError):
                                    gpu_temps[gpu_num] = None
                        else:
                            print(f"Quanta GPU_{gpu_num} request failed for {bmc_ip}: HTTP {response.status_code}")
                    except requests.exceptions.Timeout:
                        print(f"Quanta GPU_{gpu_num} request timed out for {bmc_ip}")
                        continue
                    except requests.exceptions.RequestException as e:
                        print(f"Quanta GPU_{gpu_num} request exception for {bmc_ip}: {e}")
                        continue
                return gpu_temps

            elif system_type == "gt":
                # GT: GPUs numbered 0-7, using specific UBB sensor IDs
                # Sensor IDs: 51, 59, 67, 75, 83, 91, 99, 107 (corresponding to GPUs 0-7)
                sensor_ids = [51, 59, 67, 75, 83, 91, 99, 107]
                gpu_temps = [None] * 8
                
                for gpu_num, sensor_id in enumerate(sensor_ids):
                    try:
                        # GT systems use port 8080 for Redfish API
                        url = f"http://{bmc_ip}:8080/redfish/v1/Chassis/1/Sensors/ubb_{sensor_id}"
                        response = requests.get(url, auth=(username, password), verify=False, timeout=10)
                        
                        if response.status_code == 200:
                            try:
                                sensor_data = response.json()
                            except json.JSONDecodeError:
                                print(f"GT GPU_{gpu_num} (sensor ubb_{sensor_id}) JSON decode error for {bmc_ip}")
                                continue
                            
                            # GT returns temperature in "Reading" field
                            reading = sensor_data.get("Reading")
                            if reading is not None and 0 <= reading <= 200:
                                try:
                                    gpu_temps[gpu_num] = float(reading)
                                    print(f"  GT GPU_{gpu_num} (ubb_{sensor_id}): {reading}°C")
                                except (ValueError, TypeError):
                                    print(f"  GT GPU_{gpu_num} invalid reading: {reading}")
                                    gpu_temps[gpu_num] = None
                        else:
                            print(f"GT GPU_{gpu_num} (ubb_{sensor_id}) request failed for {bmc_ip}: HTTP {response.status_code}")
                            
                    except requests.exceptions.Timeout:
                        print(f"GT GPU_{gpu_num} (ubb_{sensor_id}) request timed out for {bmc_ip}")
                        continue
                    except requests.exceptions.RequestException as e:
                        print(f"GT GPU_{gpu_num} (ubb_{sensor_id}) request exception for {bmc_ip}: {e}")
                        continue
                
                return gpu_temps

            else:
                print(f"Unknown system type: {system_type}")
                return None

        except requests.exceptions.Timeout:
            print(f"Redfish request timed out for {bmc_ip}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request exception for {bmc_ip}: {e}")
            return None
        except Exception as e:
            print(f"Exception during Redfish fetch for {bmc_ip}: {e}")
            return None

    # First attempt
    print(f"Attempting GPU temperature fetch for {bmc_ip} (type: {system_type})")
    gpu_temperatures = attempt_fetch()

    if gpu_temperatures is not None:
        valid_temps = [t for t in gpu_temperatures if t is not None]
        print(f"First attempt successful for {bmc_ip}: {len(valid_temps)}/8 GPUs reported")
        return gpu_temperatures

    # Retry once if first attempt failed
    print(f"First attempt failed for {bmc_ip}, retrying...")
    gpu_temperatures = attempt_fetch()

    if gpu_temperatures is not None:
        valid_temps = [t for t in gpu_temperatures if t is not None]
        print(f"Retry successful for {bmc_ip}: {len(valid_temps)}/8 GPUs reported")
        return gpu_temperatures
    else:
        print(f"Both attempts failed for {bmc_ip}")
        return None


def parse_bmc_credentials():
    """
    Parse BMC credentials from environment variable or file.
    Tries multiple file paths to handle different environments.
    """
    import ast

    # Try different file paths in order of preference
    possible_paths = [
        os.environ.get("BMC_CREDENTIALS_FILE"),  # Environment variable path
        "/app/bmc_credentials.json",             # Docker container path
        "./bmc_credentials.json",                # Local relative path
        "bmc_credentials.json",                  # Current directory
        os.path.join(os.path.dirname(__file__), "bmc_credentials.json"),  # Same dir as script
    ]

    # Remove None values and duplicates while preserving order
    paths_to_try = []
    for path in possible_paths:
        if path and path not in paths_to_try:
            paths_to_try.append(path)

    print("=== BMC CREDENTIALS LOADING DEBUG ===")
    print(f"Will try these paths in order: {paths_to_try}")

    # Try environment variables first
    bmc_credentials_str = os.environ.get("BMC_CREDENTIALS")
    bmc_credentials_json = os.environ.get("BMC_CREDENTIALS_JSON")

    credential_list = None

    # Try JSON format from environment
    if bmc_credentials_json:
        try:
            print("Parsing credentials from JSON environment variable")
            credential_list = json.loads(bmc_credentials_json)
            print("Successfully parsed JSON credentials from environment")
        except Exception as e:
            print(f"Error parsing JSON credentials from environment: {e}")

    # Try Python literal format from environment
    if not credential_list and bmc_credentials_str:
        try:
            print("Parsing credentials from Python literal environment variable")
            cleaned_str = bmc_credentials_str.strip().replace("\n", "").replace("\r", "")
            credential_list = ast.literal_eval(cleaned_str)
            print("Successfully parsed Python literal credentials from environment")
        except Exception as e:
            print(f"Error parsing Python literal credentials from environment: {e}")

    # Try loading from files if environment variables didn't work
    if not credential_list:
        for file_path in paths_to_try:
            try:
                print(f"Trying to load credentials from: {file_path}")
                if not file_path or not os.path.exists(file_path):
                    print(f"File does not exist: {file_path}")
                    continue

                with open(file_path, "r") as f:
                    content = f.read()
                    print(f"File found, content length: {len(content)} characters")
                    credential_list = json.loads(content)
                    print(f"Successfully loaded {len(credential_list)} credential sets from: {file_path}")
                    break  # Stop trying other paths once we find a working file

            except FileNotFoundError:
                print(f"File not found: {file_path}")
                continue
            except json.JSONDecodeError as e:
                print(f"JSON decode error in {file_path}: {e}")
                continue
            except Exception as e:
                print(f"Error loading credentials from {file_path}: {e}")
                continue

    if not credential_list:
        print("ERROR: No BMC credentials found in any location!")
        print("Expected format: [['system','bmc_ip','username','password'], ...]")
        print("Tried environment variables: BMC_CREDENTIALS, BMC_CREDENTIALS_JSON, BMC_CREDENTIALS_FILE")
        print(f"Tried file paths: {paths_to_try}")
        return {}

    credentials_dict = {}
    try:
        if not isinstance(credential_list, list):
            print("BMC credentials must be a list format")
            return {}

        for i, credential_set in enumerate(credential_list):
            if not isinstance(credential_set, list):
                print(f"Credential set {i+1} must be a list, got: {type(credential_set)}")
                continue

            if len(credential_set) != 4:
                print(f"Credential set {i+1} must have exactly 4 elements: [system, bmc_ip, username, password], got: {credential_set}")
                continue

            system_name = str(credential_set[0]).strip()
            bmc_ip = str(credential_set[1]).strip()
            username = str(credential_set[2]).strip()
            password = str(credential_set[3]).strip()

            if not (system_name and bmc_ip and username and password):
                print(f"Empty values in credential set {i+1}: {credential_set}")
                continue

            credentials_dict[system_name] = {
                "bmc_ip": bmc_ip,
                "username": username,
                "password": password,
            }
            print(f"Loaded credentials for system: {system_name} (BMC: {bmc_ip})")

    except Exception as e:
        print(f"Unexpected error processing credentials: {e}")
        return {}

    print(f"Successfully loaded credentials for {len(credentials_dict)} systems")
    return credentials_dict


@shared_task
def fetch_power_data():
    try:
        r = redis.Redis(
            host=os.environ.get("REDIS_HOST"),
            port=os.environ.get("REDIS_PORT"),
            password=os.environ.get("REDIS_PASSWORD"),
            db=0,
        )
        all_pdu = r.get("all_pdu")

        if not all_pdu:
            pdu_model = PDU()
            all_pdu = pdu_model.find({})
            # serialize the datetime
            for pdu in all_pdu:
                if "created" in pdu and hasattr(pdu["created"], "isoformat"):
                    pdu["created"] = pdu["created"].isoformat()
                if "updated" in pdu and hasattr(pdu["updated"], "isoformat"):
                    pdu["updated"] = pdu["updated"].isoformat()

            # store in Redis with 3 days TTL
            r.setex("all_pdu", 259200, json.dumps(all_pdu))
        else:
            # decode bytes/str safely
            if isinstance(all_pdu, bytes):
                try:
                    all_pdu = json.loads(all_pdu.decode("utf-8"))
                except Exception:
                    all_pdu = json.loads(all_pdu)
            elif isinstance(all_pdu, str):
                all_pdu = json.loads(all_pdu)
            else:
                # If some other type (e.g. memoryview), try to coerce
                try:
                    all_pdu = json.loads(all_pdu)
                except Exception:
                    print("Unexpected type for all_pdu from Redis; treating as empty")
                    all_pdu = []

        power_list = []
        created_time = datetime.now()

        for pdu in all_pdu:
            hostname = pdu.get("hostname")
            site = pdu.get("site")
            location = pdu.get("location")
            output_power_total_oid = pdu.get("output_power_total_oid")
            system = pdu.get("system")

            total_power = asyncio.run(snmpFetch(hostname, output_power_total_oid, "amd123", "power"))
            total_power = total_power or 0  # default to 0 if None

            power_list.append(
                {
                    "site": site,
                    "location": location,
                    "pdu_hostname": hostname,
                    "reading": total_power,
                    "symbol": "W",
                    **({"system": system} if system else {}),
                }
            )

        # upload to DB
        power = Power()
        metrics_recorded = 0
        for power_data in power_list:
            # Record Prometheus metric BEFORE database insertion
            if POWER_GAUGE:
                try:
                    POWER_GAUGE.labels(
                        site=power_data.get("site", "unknown"),
                        rack=power_data.get("location", "unknown"),
                        sensor=power_data.get("pdu_hostname", "unknown")
                    ).set(power_data.get("reading", 0))
                    metrics_recorded += 1
                except Exception as e:
                    print(f"[METRICS] Failed to record power metric for {power_data.get('pdu_hostname')}: {e}")
            
            # Insert to database
            power.create(
                {
                    **power_data,
                    "created": created_time,
                    "updated": created_time,
                }
            )
        
        if POWER_GAUGE and metrics_recorded > 0:
            print(f"[METRICS] Recorded {metrics_recorded} power metrics")
        
        print("Power data fetched and stored successfully into DB")
    except Exception as e:
        print(f"Error fetching power data: {e}")
        return


@shared_task
def fetch_temperature_data():
    try:
        redis_host = str(os.environ.get("REDIS_HOST") or "localhost")
        redis_port = int(os.environ.get("REDIS_PORT") or 6379)
        redis_password = str(os.environ.get("REDIS_PASSWORD") or "")
        r = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password if redis_password else None,
            db=0,
        )
        temperature_pdu = r.get("temperature_pdu")

        if not temperature_pdu:
            pdu_model = PDU()
            temperature_pdu = pdu_model.find({"temperature": {"$exists": True}})
            # serialize the datetime
            for pdu_item in temperature_pdu:
                if "created" in pdu_item and hasattr(pdu_item["created"], "isoformat"):
                    pdu_item["created"] = pdu_item["created"].isoformat()
                if "updated" in pdu_item and hasattr(pdu_item["updated"], "isoformat"):
                    pdu_item["updated"] = pdu_item["updated"].isoformat()

            # store in Redis with 3 days TTL
            r.setex("temperature_pdu", 259200, json.dumps(temperature_pdu))
        else:
            # Only decode if it's bytes or str, not Awaitable
            if isinstance(temperature_pdu, bytes):
                temperature_pdu = json.loads(temperature_pdu.decode("utf-8"))
            elif isinstance(temperature_pdu, str):
                temperature_pdu = json.loads(temperature_pdu)
            else:
                raise TypeError("Unexpected type for temperature_pdu from Redis")

        temperature_list = []
        created_time = datetime.now()

        for pdu in temperature_pdu:
            hostname = pdu.get("hostname")
            site = pdu.get("site")
            location = pdu.get("location")
            temperature_oid = pdu.get("temperature", {}).get("oid")
            position = pdu.get("temperature", {}).get("position")

            print(f"Processing: {hostname} ({location}-{position})")  # Debug print

            curr_temperature = asyncio.run(snmpFetch(hostname, temperature_oid, "amd123", "temp"))
            print(f"SNMP result for {hostname} ({location}-{position}): {curr_temperature}")  # Debug print

            if curr_temperature is not None:
                temperature_list.append(
                    {
                        "site": site,
                        "location": "-".join([location, position]) if location and position else location or position,
                        "pdu_hostname": hostname,
                        "reading": curr_temperature,
                        "symbol": "°C",
                    }
                )

        # upload to DB
        temperature = Temperature()
        metrics_recorded = 0
        for temperature_data in temperature_list:
            # Record Prometheus metric BEFORE database insertion
            if TEMP_GAUGE:
                try:
                    TEMP_GAUGE.labels(
                        site=temperature_data.get("site", "unknown"),
                        sensor=temperature_data.get("location", "unknown")
                    ).set(temperature_data.get("reading", 0))
                    metrics_recorded += 1
                except Exception as e:
                    print(f"[METRICS] Failed to record temperature metric for {temperature_data.get('pdu_hostname')}: {e}")
            
            # Insert to database
            temperature.create(
                {
                    **temperature_data,
                    "created": created_time,
                    "updated": created_time,
                }
            )
        
        if TEMP_GAUGE and metrics_recorded > 0:
            print(f"[METRICS] Recorded {metrics_recorded} temperature metrics")
        
        print("Temperature data fetched and stored successfully into DB")
    except Exception as e:
        print(f"Error fetching temperature data: {e}")
        return


@shared_task
def fetch_system_temperature_data():
    """
    Fetch system GPU temperature data using Redfish API or SSH for all 8 GPUs per system.
    Matches system names from database with BMC credentials and collects GPU temperature data.
    """
    try:
        # Parse BMC credentials from environment
        bmc_credentials = parse_bmc_credentials()

        if not bmc_credentials:
            print("No valid BMC credentials found")
            return

        # Check if SystemTemperature model is available
        if SystemTemperature is None:
            print("ERROR: SystemTemperature model is not available. Check if the model file exists and is properly imported.")
            return

        # Get systems from database
        print("Fetching systems from database...")
        try:
            systems_model = Systems()
            all_systems = systems_model.find({})
            print(f"Found {len(all_systems)} systems in database")
        except Exception as e:
            print(f"Error fetching systems from database: {e}")
            return

        if not all_systems:
            print("No systems found in database")
            return

        system_temperature_list = []
        created_time = datetime.now()
        matched_systems = 0

        # Process each system from database
        for system in all_systems:
            system_name = system.get("system")
            if not system_name:
                print(f"System record missing system field: {system}")
                continue

            # Check if we have BMC credentials for this system
            if system_name not in bmc_credentials:
                print(f"No BMC credentials found for system: {system_name}")
                continue

            matched_systems += 1
            credentials = bmc_credentials[system_name]
            bmc_ip = credentials["bmc_ip"]
            username = credentials["username"]
            password = credentials["password"]

            # Determine system type
            system_type = determine_system_type(system_name)
            print(f"Processing system: {system_name} (BMC: {bmc_ip}, Type: {system_type})")

            # Fetch GPU temperatures based on system type
            if system_type == "banff":
                # Banff uses SSH to rack manager instead of Redfish
                gpu_temperatures = fetch_gpu_temperatures_banff_ssh(bmc_ip, username, password, system_name)

            elif system_type == "dell":
                # Dell systems use SSH with racadm and local curl
                gpu_temperatures = fetch_gpu_temperatures_dell_ssh(bmc_ip, username, password, system_name)

            else:
                # Other systems use Redfish
                gpu_temperatures = fetch_gpu_temperatures_redfish(bmc_ip, username, password, system_type)

            if gpu_temperatures is not None:
                # Update Prometheus metrics for each GPU
                metrics_recorded = 0
                if SYSTEM_GPU_TEMP_GAUGE:
                    for gpu_idx, temp in enumerate(gpu_temperatures):
                        if temp is not None:
                            try:
                                SYSTEM_GPU_TEMP_GAUGE.labels(
                                    system=system_name,
                                    gpu=str(gpu_idx)
                                ).set(temp)
                                metrics_recorded += 1
                            except Exception as e:
                                print(f"[METRICS] Failed to record metric for {system_name} GPU {gpu_idx}: {e}")
                    
                    print(f"[METRICS] Recorded {metrics_recorded} GPU temperature metrics for {system_name}")
                else:
                    print(f"[METRICS] SYSTEM_GPU_TEMP_GAUGE not available, skipping metric recording")
                
                # Create temperature record with GPU array
                temp_data = {
                    "system": system_name,
                    "bmc_ip": bmc_ip,
                    "gpu_temperatures": gpu_temperatures,  # List of 8 temps (some may be None)
                    "symbol": "°C",
                    "created": created_time,
                    "updated": created_time,
                }
                system_temperature_list.append(temp_data)

                valid_temps = [t for t in gpu_temperatures if t is not None]
                print(f"Successfully collected temperatures for {system_name}: {len(valid_temps)}/8 GPUs")
                print(f"GPU temps: {gpu_temperatures}")
            else:
                print(f"Failed to collect GPU temperatures for {system_name} (BMC: {bmc_ip})")
                print(f"FAILURE LOG: {system_name} - Could not retrieve data")

        print(f"Processed {matched_systems} systems with BMC credentials out of {len(all_systems)} total systems")

        # Upload to DB with detailed logging
        if system_temperature_list:
            print(f"Attempting to save {len(system_temperature_list)} GPU temperature records to database...")
            try:
                # Initialize the SystemTemperature model
                system_temp = SystemTemperature()
                print("SystemTemperature model initialized successfully")

                successful_inserts = 0
                failed_inserts = 0

                for i, temp_data in enumerate(system_temperature_list):
                    try:
                        valid_gpus = len([t for t in temp_data["gpu_temperatures"] if t is not None])
                        print(f"Inserting record {i+1}/{len(system_temperature_list)}: {temp_data['system']} - {valid_gpus}/8 GPUs")
                        result = system_temp.create(temp_data)
                        print(f"Database insert result: {result}")
                        successful_inserts += 1
                    except Exception as e:
                        print(f"Failed to insert record {i+1} ({temp_data['system']}): {e}")
                        print(f"Failed record data: {temp_data}")
                        failed_inserts += 1

                print(f"Database insertion complete: {successful_inserts} successful, {failed_inserts} failed")

                if successful_inserts > 0:
                    print(f"System GPU temperature data successfully stored in DB ({successful_inserts} records)")
                else:
                    print("No records were successfully inserted into the database")

            except Exception as e:
                print(f"Error initializing SystemTemperature model or database connection: {e}")
                import traceback
                traceback.print_exc()

        else:
            print("No system GPU temperature data collected to save")

    except Exception as e:
        print(f"Error in fetch_system_temperature_data: {e}")
        import traceback
        traceback.print_exc()
        return


def fetch_fan_speed_via_ipmi(bmc_ip: str, username: str, password: str):
    """
    Fetch fan speed data using ipmitool sdr command.
    Returns a list of dictionaries with fan name and RPM speed.
    Example: [{"fan": "Fan_SYS1_1", "rpm": 9600}, {"fan": "Fan_SYS1_2", "rpm": 9400}]
    """
    try:
        import subprocess
        
        # Build ipmitool command
        cmd = [
            "ipmitool",
            "-I", "lan",
            "-U", username,
            "-P", password,
            "-H", bmc_ip,
            "sdr"
        ]
        
        print(f"Running ipmitool command for BMC: {bmc_ip}")
        
        # Execute command with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"ipmitool command failed for {bmc_ip}: {result.stderr}")
            return None
        
        raw_output = result.stdout
        print(f"ipmitool output length: {len(raw_output)} characters")
        
        # Parse output for fan metrics
        fan_data = []
        for line in raw_output.split('\n'):
            # Look for lines containing "RPM"
            if 'RPM' in line:
                try:
                    # Example line: "Fan_SYS1_1       | 9600 RPM          | ok"
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 2:
                        fan_name = parts[0].strip()
                        rpm_str = parts[1].strip()
                        
                        # Extract numeric RPM value
                        rpm_match = rpm_str.split()[0]  # Get first token (the number)
                        rpm_value = int(rpm_match)
                        
                        fan_data.append({
                            "fan": fan_name,
                            "rpm": rpm_value
                        })
                        print(f"Parsed: {fan_name} = {rpm_value} RPM")
                        
                except (ValueError, IndexError) as e:
                    print(f"Failed to parse fan line: {line}, error: {e}")
                    continue
        
        print(f"Successfully parsed {len(fan_data)} fan metrics from {bmc_ip}")
        return fan_data if fan_data else None
        
    except subprocess.TimeoutExpired:
        print(f"ipmitool command timed out for {bmc_ip}")
        return None
    except FileNotFoundError:
        print("ipmitool command not found. Please install ipmitool package.")
        return None
    except Exception as e:
        print(f"Error fetching fan speed for {bmc_ip}: {e}")
        return None


@shared_task
def fetch_system_fan_speed_data():
    """
    Fetch system fan speed data using ipmitool for all systems.
    Exposes metrics via SYSTEM_FAN_SPEED gauge to Prometheus.
    """
    try:
        # Parse BMC credentials (reuse existing method)
        print("Fetching BMC credentials...")
        bmc_credentials = parse_bmc_credentials()
        
        if not bmc_credentials:
            print("No valid BMC credentials found")
            return
        
        print(f"Found {len(bmc_credentials)} systems with BMC credentials")
        
        matched_systems = 0
        total_fans_recorded = 0
        
        # Process each system with credentials
        for system_name, credentials in bmc_credentials.items():
            matched_systems += 1
            bmc_ip = credentials["bmc_ip"]
            username = credentials["username"]
            password = credentials["password"]
            
            print(f"Processing system: {system_name} (BMC: {bmc_ip})")
            
            # Fetch fan speed data via ipmitool
            fan_data_list = fetch_fan_speed_via_ipmi(bmc_ip, username, password)
            
            if fan_data_list:
                # Record Prometheus metrics
                metrics_recorded = 0
                if SYSTEM_FAN_SPEED:
                    for fan_data in fan_data_list:
                        try:
                            SYSTEM_FAN_SPEED.labels(
                                system=system_name,
                                fan=fan_data["fan"]
                            ).set(fan_data["rpm"])
                            metrics_recorded += 1
                        except Exception as e:
                            print(f"[METRICS] Failed to record fan metric for {system_name}/{fan_data['fan']}: {e}")
                    
                    print(f"[METRICS] Recorded {metrics_recorded} fan speed metrics for {system_name}")
                    total_fans_recorded += metrics_recorded
                else:
                    print(f"[METRICS] SYSTEM_FAN_SPEED gauge not available, skipping metric recording")
                
                print(f"Successfully collected fan speeds for {system_name}: {len(fan_data_list)} fans")
            else:
                print(f"Failed to collect fan speeds for {system_name} (BMC: {bmc_ip})")
        
        print(f"Processed {matched_systems} systems with BMC credentials")
        print(f"Total fan metrics recorded: {total_fans_recorded}")
        
    except Exception as e:
        print(f"Error in fetch_system_fan_speed_data: {e}")
        import traceback
        traceback.print_exc()
        return