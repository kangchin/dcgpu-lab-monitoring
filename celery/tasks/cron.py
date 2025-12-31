
"""
Enhanced System Temperature Monitoring with Critical Alert System

This implementation adds dynamic scheduling for systems with critical temperatures.
Systems with temperatures >= 80°C are checked every 30 seconds instead of every 5 minutes.
"""

# ============================================================================
# celery/tasks/cron.py - MODIFIED VERSION
# ============================================================================

import os
import json
import redis
import asyncio
import subprocess
import re
import requests
import paramiko
import time
from datetime import datetime, timedelta
from celery import shared_task
from utils.models.pdu import PDU
from utils.models.power import Power
from utils.models.temperature import Temperature
from utils.models.systems import Systems
from puresnmp import Client, V2C, ObjectIdentifier as OID
from dotenv import load_dotenv
import urllib3
import asyncio
from concurrent.futures import ThreadPoolExecutor


EXECUTOR = ThreadPoolExecutor(max_workers=20)  # Adjust based on needs

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

# ============================================================================
# TEMPERATURE VALIDATION AND RETRY CONSTANTS
# ============================================================================
MIN_VALID_TEMP = 20.0
MAX_VALID_TEMP = 100.0
MAX_RETRY_ATTEMPTS = 3
MAX_CONCURRENT_SYSTEMS = 10  # Adjust based on network capacity
RETRY_DELAY_SECONDS = 5      # Reduced from 30 seconds

# ============================================================================
# CRITICAL TEMPERATURE MONITORING CONSTANTS
# ============================================================================
CRITICAL_TEMP_THRESHOLD = 80.0
CRITICAL_CHECK_INTERVAL = 30  # seconds
NORMAL_CHECK_INTERVAL = 300   # 5 minutes in seconds

# Redis keys for tracking critical systems
CRITICAL_SYSTEMS_KEY = "critical_temp_systems"
LAST_CHECK_TIME_KEY = "system_temp_last_check"

def get_redis_lock_client():
    """Get Redis client for task locking"""
    try:
        redis_host = str(os.environ.get("REDIS_HOST") or "localhost")
        redis_port = int(os.environ.get("REDIS_PORT") or 6379)
        redis_password = str(os.environ.get("REDIS_PASSWORD") or "")
        
        return redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password if redis_password else None,
            db=0,
            decode_responses=True
        )
    except Exception as e:
        print(f"Error creating Redis client: {e}")
        return None

def get_redis_client():
    """Get Redis client for tracking critical systems"""
    try:
        redis_host = str(os.environ.get("REDIS_HOST") or "localhost")
        redis_port = int(os.environ.get("REDIS_PORT") or 6379)
        redis_password = str(os.environ.get("REDIS_PASSWORD") or "")
        
        return redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password if redis_password else None,
            db=0,
            decode_responses=True
        )
    except Exception as e:
        print(f"Error creating Redis client: {e}")
        return None


def is_critical_temperature(gpu_temps):
    """
    Check if any GPU temperature is at or above critical threshold.
    
    Args:
        gpu_temps: List of 8 GPU temperatures (may contain None values)
    
    Returns:
        tuple: (is_critical: bool, max_temp: float or None, critical_gpus: list)
    """
    if not gpu_temps or not isinstance(gpu_temps, list):
        return False, None, []
    
    valid_temps = [t for t in gpu_temps if t is not None]
    
    if not valid_temps:
        return False, None, []
    
    max_temp = max(valid_temps)
    critical_gpus = [i for i, t in enumerate(gpu_temps) if t is not None and t >= CRITICAL_TEMP_THRESHOLD]
    
    is_critical = max_temp >= CRITICAL_TEMP_THRESHOLD
    
    return is_critical, max_temp, critical_gpus


def update_critical_systems_list(system_name, is_critical, max_temp, redis_client):
    """
    Update the Redis set of systems with critical temperatures.
    
    Args:
        system_name: Name of the system
        is_critical: Boolean indicating if system is at critical temp
        max_temp: Maximum temperature recorded
        redis_client: Redis client instance
    """
    if not redis_client:
        return
    
    try:
        critical_systems_data = redis_client.get(CRITICAL_SYSTEMS_KEY)
        critical_systems = json.loads(critical_systems_data) if critical_systems_data else {}
        
        if is_critical:
            # Add or update system in critical list
            critical_systems[system_name] = {
                "max_temp": max_temp,
                "timestamp": datetime.now().isoformat(),
                "check_count": critical_systems.get(system_name, {}).get("check_count", 0) + 1
            }
            print(f"🔥 CRITICAL ALERT: {system_name} added to critical monitoring - Max temp: {max_temp}°C")
        else:
            # Remove system from critical list if it exists
            if system_name in critical_systems:
                removed_data = critical_systems.pop(system_name)
                print(f"✅ RECOVERY: {system_name} removed from critical monitoring - Was: {removed_data['max_temp']}°C, Now below {CRITICAL_TEMP_THRESHOLD}°C")
        
        # Save updated list
        redis_client.setex(
            CRITICAL_SYSTEMS_KEY,
            86400,  # 24 hour TTL
            json.dumps(critical_systems)
        )
        
        # Log current critical systems count
        if critical_systems:
            print(f"⚠️  Currently monitoring {len(critical_systems)} critical system(s): {list(critical_systems.keys())}")
        
    except Exception as e:
        print(f"Error updating critical systems list: {e}")


def get_critical_systems(redis_client):
    """
    Get list of systems currently at critical temperatures.
    
    Returns:
        dict: Dictionary of critical systems with their data
    """
    if not redis_client:
        return {}
    
    try:
        critical_systems_data = redis_client.get(CRITICAL_SYSTEMS_KEY)
        return json.loads(critical_systems_data) if critical_systems_data else {}
    except Exception as e:
        print(f"Error getting critical systems: {e}")
        return {}


def should_check_system_now(system_name, redis_client):
    """
    Determine if a system should be checked now based on its critical status.
    
    Args:
        system_name: Name of the system
        redis_client: Redis client instance
    
    Returns:
        tuple: (should_check: bool, reason: str)
    """
    if not redis_client:
        return True, "Redis unavailable, checking all systems"
    
    try:
        # Get critical systems list
        critical_systems = get_critical_systems(redis_client)
        
        # Get last check time for this system
        last_check_key = f"{LAST_CHECK_TIME_KEY}:{system_name}"
        last_check_time_str = redis_client.get(last_check_key)
        
        is_critical = system_name in critical_systems
        
        if not last_check_time_str:
            return True, "First check"
        
        last_check_time = datetime.fromisoformat(last_check_time_str)
        time_since_check = (datetime.now() - last_check_time).total_seconds()
        
        if is_critical:
            # Check every 30 seconds for critical systems
            if time_since_check >= CRITICAL_CHECK_INTERVAL:
                return True, f"Critical system check (last: {int(time_since_check)}s ago, max: {critical_systems[system_name]['max_temp']}°C)"
            else:
                return False, f"Critical system checked recently ({int(time_since_check)}s ago)"
        else:
            # Check every 5 minutes for normal systems
            if time_since_check >= NORMAL_CHECK_INTERVAL:
                return True, f"Normal check (last: {int(time_since_check)}s ago)"
            else:
                return False, f"Normal system checked recently ({int(time_since_check)}s ago)"
        
    except Exception as e:
        print(f"Error in should_check_system_now: {e}")
        return True, "Error checking status, defaulting to check"


def record_system_check_time(system_name, redis_client):
    """Record the time a system was checked."""
    if not redis_client:
        return
    
    try:
        last_check_key = f"{LAST_CHECK_TIME_KEY}:{system_name}"
        redis_client.setex(
            last_check_key,
            86400,  # 24 hour TTL
            datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Error recording check time: {e}")

def validate_gpu_temperatures(gpu_temps):
    """
    Validate GPU temperature array.
    Returns (is_valid, reason) tuple.
    
    Valid temperatures must:
    - Be a list of 8 elements
    - Have at least one non-None value
    - All non-None values must be between MIN_VALID_TEMP and MAX_VALID_TEMP
    """
    if gpu_temps is None:
        return False, "No temperature data returned"
    
    if not isinstance(gpu_temps, list) or len(gpu_temps) != 8:
        return False, f"Invalid temperature array format: {gpu_temps}"
    
    valid_temps = [t for t in gpu_temps if t is not None]
    
    if len(valid_temps) == 0:
        return False, "All GPU temperatures are None"
    
    # Check if any temperature is outside valid range
    invalid_temps = [t for t in valid_temps if t < MIN_VALID_TEMP or t > MAX_VALID_TEMP]
    
    if invalid_temps:
        return False, f"Temperature(s) outside valid range ({MIN_VALID_TEMP}-{MAX_VALID_TEMP}°C): {invalid_temps}"
    
    return True, "Valid"


async def fetch_gpu_temperatures_with_retry_async(system_name, bmc_ip, username, password, system_type):
    """
    NON-BLOCKING retry logic using asyncio.sleep
    
    OLD: time.sleep(30) - BLOCKED entire worker for 30 seconds per retry
    NEW: await asyncio.sleep(5) - Worker can process other systems while waiting
    """
    validation_messages = []
    
    for attempt in range(1, MAX_RETRY_ATTEMPTS + 1):
        print(f"[RETRY] Attempt {attempt}/{MAX_RETRY_ATTEMPTS} for {system_name}")
        
        # Run blocking I/O in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        
        if system_type == "banff":
            gpu_temps = await loop.run_in_executor(
                EXECUTOR,  
                fetch_gpu_temperatures_banff_ssh, 
                bmc_ip, username, password, system_name
            )
        elif system_type == "dell":
            gpu_temps = await loop.run_in_executor(
                EXECUTOR,
                fetch_gpu_temperatures_dell_ssh,
                bmc_ip, username, password, system_name
            )
        else:
            gpu_temps = await loop.run_in_executor(
                EXECUTOR,
                fetch_gpu_temperatures_redfish,
                bmc_ip, username, password, system_type
            )
        
        is_valid, reason = validate_gpu_temperatures(gpu_temps)
        
        validation_msg = f"Attempt {attempt}: {reason}"
        validation_messages.append(validation_msg)
        print(f"[RETRY] {system_name} - {validation_msg}")
        
        if is_valid:
            print(f"[RETRY] {system_name} - Valid on attempt {attempt}")
            return gpu_temps, attempt, validation_messages
        
        # NON-BLOCKING wait (was time.sleep)
        if attempt < MAX_RETRY_ATTEMPTS:
            print(f"[RETRY] {system_name} - Waiting {RETRY_DELAY_SECONDS}s (NON-BLOCKING)...")
            await asyncio.sleep(RETRY_DELAY_SECONDS)  
        else:
            print(f"[RETRY] {system_name} - All attempts exhausted")
    
    return gpu_temps, MAX_RETRY_ATTEMPTS, validation_messages


async def process_single_system_async(system, bmc_credentials, redis_client, created_time):
    """
    Process one system asynchronously (non-blocking)
    Returns temperature data dict or None
    """
    system_name = system.get("system")
    if not system_name or system_name not in bmc_credentials:
        return None
    
    should_check, reason = should_check_system_now(system_name, redis_client)
    
    if not should_check:
        print(f"SKIPPING {system_name}: {reason}")
        return None
    
    print(f"✓ CHECKING {system_name}: {reason}")
    
    credentials = bmc_credentials[system_name]
    bmc_ip = credentials["bmc_ip"]
    username = credentials["username"]
    password = credentials["password"]
    
    system_type = determine_system_type(system_name)
    
    # Use async retry (non-blocking)
    gpu_temperatures, attempts_made, _ = await fetch_gpu_temperatures_with_retry_async(
        system_name, bmc_ip, username, password, system_type
    )
    
    if gpu_temperatures is not None:
        is_critical, max_temp, critical_gpus = is_critical_temperature(gpu_temperatures)
        
        if redis_client:
            update_critical_systems_list(system_name, is_critical, max_temp, redis_client)
        
        if is_critical:
            print(f"CRITICAL: {system_name} - {max_temp}°C")
        
        temp_data = {
            "system": system_name,
            "bmc_ip": bmc_ip,
            "gpu_temperatures": gpu_temperatures,
            "symbol": "°C",
            "created": created_time,
            "updated": created_time,
        }
        
        valid_temps = [t for t in gpu_temperatures if t is not None]
        print(f"✓ {system_name}: {len(valid_temps)}/8 GPUs, {attempts_made} attempts")
        
        if redis_client:
            record_system_check_time(system_name, redis_client)
        
        return temp_data
    else:
        print(f"✗ {system_name}: Failed after {attempts_made} attempts")
        return None


async def fetch_system_temperature_data_async():
    """
    Main async function - processes systems CONCURRENTLY
    
    OLD: Sequential processing - 100 systems × 30s = 50 minutes!
    NEW: Concurrent batches - 100 systems ÷ 10 concurrent × 10s = ~2 minutes!
    """
    try:
        redis_client = get_redis_client()
        
        if redis_client:
            print("=" * 80)
            print("NON-BLOCKING CONCURRENT TEMPERATURE MONITORING")
            print("=" * 80)
            critical_systems = get_critical_systems(redis_client)
            if critical_systems:
                print(f"{len(critical_systems)} critical system(s) monitored")
            print(f"Max concurrent: {MAX_CONCURRENT_SYSTEMS} systems")
            print("=" * 80)
        
        bmc_credentials = parse_bmc_credentials()
        if not bmc_credentials:
            print("No BMC credentials")
            return

        if SystemTemperature is None:
            print("SystemTemperature model unavailable")
            return

        systems_model = Systems()
        all_systems = systems_model.find({})
        print(f"Found {len(all_systems)} systems to check")

        if not all_systems:
            return

        created_time = datetime.now()
        
        # Create concurrent tasks for ALL systems
        tasks = [
            process_single_system_async(system, bmc_credentials, redis_client, created_time)
            for system in all_systems
        ]
        
        # Limit concurrency with semaphore (prevents overwhelming network)
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_SYSTEMS)
        
        async def bounded_task(task):
            async with semaphore:
                return await task
        
        print(f"Processing {len(tasks)} systems with {MAX_CONCURRENT_SYSTEMS} concurrent workers...")
        start_time = datetime.now()
        
        # Execute all tasks concurrently!
        results = await asyncio.gather(
            *[bounded_task(task) for task in tasks], 
            return_exceptions=True
        )
        
        elapsed = (datetime.now() - start_time).total_seconds()
        
        # Filter successful results
        temperature_results = [
            result for result in results 
            if result is not None and not isinstance(result, Exception)
        ]
        
        print(f"\n{'=' * 80}")
        print(f"COMPLETED: {len(temperature_results)}/{len(all_systems)} systems in {elapsed:.1f}s")
        print(f"Throughput: {len(all_systems)/elapsed:.1f} systems/sec")
        print(f"{'=' * 80}\n")

        # Save to database
        if temperature_results:
            print(f"Saving {len(temperature_results)} records to database...")
            system_temp = SystemTemperature()
            successful = 0
            
            for temp_data in temperature_results:
                try:
                    system_temp.create(temp_data)
                    successful += 1
                except Exception as e:
                    print(f"DB error for {temp_data['system']}: {e}")
            
            print(f"Saved {successful}/{len(temperature_results)} records")
        else:
            print("No temperature data collected")

    except Exception as e:
        print(f"Error in async temperature fetch: {e}")
        import traceback
        traceback.print_exc()

@shared_task
def say_hello():
    print("Hello from Celery!")


async def snmpFetch(pdu_hostname: str, oid: str, v2c: str, type: str):
    try:
        client = Client(pdu_hostname, V2C(v2c))
        data = await client.get(OID(oid))
        if not data:
            return None
        if type == "temp":
            return float(data.value / 10)
        else:
            return int(data.value)
    except Exception as e:
        print(f"snmpFetch error for {pdu_hostname} oid {oid}: {e}")
        return None


def determine_system_type(system_name: str):
    """Determine system type based on system name prefix."""
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
    OPTIMIZED Dell SSH function
    - Reduced initial wait: 2s → 1s
    - Reduced root shell wait: 5s → 2s  
    - Reduced per-GPU wait: 2s → 1s
    
    Total time saved: ~40% faster per Dell system
    """
    import time  # Still need time.sleep here as this runs in thread pool
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(bmc_ip, username=username, password=password, timeout=15, 
                   look_for_keys=False, allow_agent=False)
        
        shell = ssh.invoke_shell()
        shell.settimeout(15)
        
        time.sleep(1)  # Reduced from 2s
        if shell.recv_ready():
            _ = shell.recv(65535).decode('utf-8', errors='ignore')

        shell.send("racadm debug invoke rootshellash\n")
        time.sleep(2)  # Reduced from 5s
        
        if shell.recv_ready():
            _ = shell.recv(65535).decode('utf-8', errors='ignore')

        gpu_temps = [None] * 8

        for gpu_num in range(8):
            marker = f"GPU{gpu_num}TEMP"
            curl_cmd = (
                f"curl -s http://192.168.31.1/redfish/v1/Chassis/OAM_{gpu_num}/"
                f"ThermalSubsystem/ThermalMetrics 2>/dev/null | "
                f"awk '/GPU_{gpu_num}_DIE_TEMP/{{f=1}} f && /ReadingCelsius/"
                f"{{print \"{marker}:\" $2; exit}}'\n"
            )
            
            shell.send(curl_cmd)
            time.sleep(1)  # Reduced from 2s
            
            if shell.recv_ready():
                output = shell.recv(65535).decode('utf-8', errors='ignore')
                
                if marker in output:
                    for line in output.split("\n"):
                        if line.strip().startswith(f"{marker}:"):
                            try:
                                temp = float(line.split(":", 1)[1].strip())
                                gpu_temps[gpu_num] = temp
                            except:
                                pass
                            break

        shell.close()
        ssh.close()

        valid_temps = [t for t in gpu_temps if t is not None]
        return gpu_temps if len(valid_temps) > 0 else None

    except Exception as e:
        print(f"[DELL] Error: {e}")
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
            timeout=15,
            look_for_keys=False,
            allow_agent=False
        )

        # Execute the command with dynamic rack ID
        command = f"set sys cmd -i {rack_id} -c sdr"
        stdin, stdout, stderr = ssh.exec_command(command, timeout=15)

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
                response = requests.get(url, auth=(username, password), verify=False, timeout=15)
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
                response = requests.get(url, auth=(username, password), verify=False, timeout=15)
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
                response = requests.get(url, auth=(username, password), verify=False, timeout=15)
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


def run_async_safely(coro):
    """Run async code safely from sync context"""
    try:
        loop = asyncio.get_running_loop()
        # Already have a loop, use it
        return asyncio.ensure_future(coro)
    except RuntimeError:
        # No loop, create one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


@shared_task
def fetch_power_data():
    """
    Fetch power data with Redis lock to prevent duplicate executions.
    """
    redis_client = get_redis_lock_client()
    
    lock_key = "celery:lock:fetch_power_data"
    lock_timeout = 600  # 10 minutes
    
    if redis_client:
        lock_acquired = redis_client.set(lock_key, "locked", nx=True, ex=lock_timeout)
        
        if not lock_acquired:
            print("SKIPPING: Another worker is already running power fetch")
            return
        
        print("Lock acquired - Starting power data fetch")
    
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
            
            for pdu in all_pdu:
                if "created" in pdu and hasattr(pdu["created"], "isoformat"):
                    pdu["created"] = pdu["created"].isoformat()
                if "updated" in pdu and hasattr(pdu["updated"], "isoformat"):
                    pdu["updated"] = pdu["updated"].isoformat()

            r.setex("all_pdu", 259200, json.dumps(all_pdu))
        else:
            if isinstance(all_pdu, bytes):
                all_pdu = json.loads(all_pdu.decode("utf-8"))
            elif isinstance(all_pdu, str):
                all_pdu = json.loads(all_pdu)

        power_list = []
        created_time = datetime.now()

        for pdu in all_pdu:
            hostname = pdu.get("hostname")
            site = pdu.get("site")
            location = pdu.get("location")
            output_power_total_oid = pdu.get("output_power_total_oid")
            system = pdu.get("system")

            total_power = run_async_safely(
                snmpFetch(hostname, output_power_total_oid, "amd123", "power")
            )
            total_power = total_power or 0

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

        # Upload to DB
        power = Power()
        for power_data in power_list:
            power.create(
                {
                    **power_data,
                    "created": created_time,
                    "updated": created_time,
                }
            )

        print(f"Power data fetched: {len(power_list)} readings")
        
    except Exception as e:
        print(f"Error fetching power data: {e}")
        if redis_client:
            redis_client.delete(lock_key)
        raise
    finally:
        if redis_client:
            redis_client.delete(lock_key)
            print("Lock released")



@shared_task
def fetch_temperature_data():
    """
    Fetch temperature data with Redis lock to prevent duplicate executions.
    """
    redis_client = get_redis_lock_client()
    
    # Lock key and timeout
    lock_key = "celery:lock:fetch_temperature_data"
    lock_timeout = 600  # 10 minutes (same as task interval)
    
    if redis_client:
        # Try to acquire lock
        lock_acquired = redis_client.set(
            lock_key,
            "locked",
            nx=True,  # Only set if doesn't exist
            ex=lock_timeout  # Expire after 10 minutes
        )
        
        if not lock_acquired:
            print("SKIPPING: Another worker is already running this task")
            return
        
        print("Lock acquired - Starting temperature data fetch")
    
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
            
            for pdu_item in temperature_pdu:
                if "created" in pdu_item and hasattr(pdu_item["created"], "isoformat"):
                    pdu_item["created"] = pdu_item["created"].isoformat()
                if "updated" in pdu_item and hasattr(pdu_item["updated"], "isoformat"):
                    pdu_item["updated"] = pdu_item["updated"].isoformat()

            r.setex("temperature_pdu", 259200, json.dumps(temperature_pdu))
        else:
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

            print(f"Processing: {hostname} ({location}-{position})")

            curr_temperature = run_async_safely(
                snmpFetch(hostname, temperature_oid, "amd123", "temp")
            )
            
            print(f"SNMP result for {hostname} ({location}-{position}): {curr_temperature}")

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

        # Upload to DB
        temperature = Temperature()
        for temperature_data in temperature_list:
            temperature.create(
                {
                    **temperature_data,
                    "created": created_time,
                    "updated": created_time,
                }
            )

        print(f"Temperature data fetched: {len(temperature_list)} readings")
        
    except Exception as e:
        print(f"Error fetching temperature data: {e}")
        # Release lock on error so task can retry
        if redis_client:
            redis_client.delete(lock_key)
        raise
    finally:
        # Lock will auto-expire after 10 minutes, but we can delete it early on success
        if redis_client:
            redis_client.delete(lock_key)
            print("Lock released")



@shared_task
def fetch_system_temperature_data():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(fetch_system_temperature_data_async())
    finally:
        loop.close()