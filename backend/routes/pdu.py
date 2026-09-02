from datetime import datetime
import platform
import os
import time
import subprocess
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

from flask import Blueprint, jsonify, request

from routes.nmap import (
    filter_ignored_devices,
    get_scanner_service_url,
    is_windows_with_scanner_service,
    parse_nmap_output,
    scan_network_pdus,
)
from utils.factory.database import Database

pdu = Blueprint("pdu", __name__)

logger = logging.getLogger(__name__)

# Try to import pysnmp (optional)
try:
    from pysnmp.hlapi import getCmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData
    PYSNMP_AVAILABLE = True
except ImportError:
    PYSNMP_AVAILABLE = False


# ============================================================================
# PDU MANUFACTURER OID MAPPINGS
# ============================================================================
# SNMP OID definitions for different PDU manufacturers
# Updated OIDs for accurate manufacturer and model detection
# Includes: manufacturer, model, serial, MAC address, and apparent power

PDU_MANUFACTURERS = {
    "tripp_lite": {
        "manufacturer": "1.3.6.1.4.1.850.1.1.1.2.1.4.1",
        "model": "1.3.6.1.4.1.850.1.1.1.2.1.5.1",
        "serial": "1.3.6.1.4.1.850.1.1.2.1.1.5.1",
        "mac_address": "1.3.6.1.4.1.850.1.2.1.1.4.0",
        "apparent_power": "1.3.6.1.4.1.850.1.1.3.2.2.1.1.9.1",
        "display_name": "Tripp Lite"
    },
    "enlogic": {
        "manufacturer": "1.3.6.1.2.1.1.1.0",  # sysDescr OID - detect keyword "Enlogic"
        "model": "1.3.6.1.4.1.38446.1.1.2.1.11.1",
        "serial": "1.3.6.1.4.1.38446.1.1.2.1.12.1",
        "mac_address": "1.3.6.1.4.1.38446.1.1.2.1.8.1.1",
        "apparent_power": "1.3.6.1.4.1.38446.1.2.4.1.4.1",
        "display_name": "Enlogic",
        "detect_keyword": "Enlogic"  # Keyword to detect Enlogic manufacturer
    },
    "raritan": {
        "manufacturer": "1.3.6.1.4.1.13742.6.3.2.1.1.2.1",
        "model": "1.3.6.1.4.1.13742.6.3.2.1.1.3.1",
        "serial": "1.3.6.1.4.1.13742.6.3.2.1.1.4.1",
        "mac_address": "1.3.6.1.4.1.13742.6.3.2.2.1.11.1",
        "apparent_power": "1.3.6.1.4.1.13742.6.5.2.3.1.4.1.1.6",
        "display_name": "Raritan"
    }
}

# Manufacturer name mapping for apparent_power_oid migration
MANUFACTURER_MAPPING = {
    "Tripp Lite": "tripp_lite",
    "Enlogic": "enlogic",
    "Raritan": "raritan",
    "tripp_lite": "tripp_lite",
    "enlogic": "enlogic",
    "raritan": "raritan",
}


def resolve_apparent_power_oid(manufacturer: str) -> str:
    """Return an apparent-power OID only for a recognized manufacturer."""
    normalized = (manufacturer or "").strip()
    manufacturer_key = MANUFACTURER_MAPPING.get(normalized)

    if manufacturer_key and manufacturer_key in PDU_MANUFACTURERS:
        return PDU_MANUFACTURERS[manufacturer_key].get("apparent_power", "")

    normalized_lower = normalized.lower()
    for manufacturer_key, metadata in PDU_MANUFACTURERS.items():
        if normalized_lower == metadata.get("display_name", "").lower():
            return metadata.get("apparent_power", "")

    return ""


# ============================================================================
# SNMP Query Functions
# ============================================================================

def snmp_query(hostname: str, oid: str, v2c: str = "amd123", timeout: int = 5) -> Optional[str]:
    """
    Query a single SNMP OID using pysnmp or subprocess fallback.
    
    Args:
        hostname: Target hostname or IP address
        oid: SNMP Object Identifier to query
        v2c: SNMP v2c community string (default: "amd123")
        timeout: Query timeout in seconds (default: 5)
    
    Returns:
        String value from SNMP response, or None if query fails
    """
    try:
        if PYSNMP_AVAILABLE:
            # Use pysnmp library
            snmp_engine = SnmpEngine()
            iterator = getCmd(
                snmp_engine,
                CommunityData(v2c, mpModel=1),  # SNMPv2c
                UdpTransportTarget((hostname, 161), timeout=timeout),
                ContextData(),
                oid
            )
            
            error_indication, error_status, error_index, var_binds = next(iterator)
            
            if error_indication or error_status:
                logger.debug(f"SNMP query failed for {hostname} OID {oid}")
                return None
            
            # Extract the value
            for var_bind in var_binds:
                return str(var_bind[1])
            
            return None
        else:
            # Fallback to subprocess snmpget
            result = subprocess.run(
                ["snmpget", "-v2c", "-c", v2c, "-Oqv", hostname, oid],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip().strip('"')
            
            return None
    
    except Exception as e:
        logger.error(f"SNMP query error for {hostname} OID {oid}: {e}")
        return None


def get_snmp_platform_notice() -> str:
    """Return the platform-specific notice for SNMP/enrichment availability."""
    current_os = platform.system()
    if current_os == "Windows":
        return (
            "SNMP OID-based PDU metadata extraction is disabled on Windows because "
            "manufacturer, model, serial number, MAC address, and apparent_power_oid "
            "collection is not functional in development mode. The sync process skipped SNMP enrichment."
        )
    if current_os == "Linux":
        return "SNMP OID-based extraction is enabled on Linux."
    return "SNMP OID-based extraction is not available on this platform."


def extract_pdu_info(hostname: str, ip_address: str = "", v2c: str = "amd123") -> Dict:
    """
    Extract PDU information via SNMP queries.
    
    Attempts to query each manufacturer's OIDs in sequence until one responds.
    For Enlogic, detects keyword "Enlogic" in manufacturer response and hardcodes the manufacturer.
    
    Args:
        hostname: PDU hostname/FQDN to query
        ip_address: IP address (optional, for reference)
        v2c: SNMP v2c community string (default: "amd123")
    
    Returns:
        Dictionary containing PDU information
    """
    current_os = platform.system()
    if current_os == "Windows":
        logger.warning(
            "Skipping SNMP OID extraction for %s on %s. %s",
            hostname,
            current_os,
            get_snmp_platform_notice(),
        )
        return {
            "hostname": hostname,
            "ip_address": ip_address,
            "manufacturer": "",
            "model": "",
            "serial_number": "",
            "mac_address": "",
            "apparent_power_oid": "",
            "error": "SNMP OID-based extraction skipped on Windows platform",
            "snmp_skipped": True,
            "notice": get_snmp_platform_notice(),
        }

    pdu_info = {
        "hostname": hostname,
        "ip_address": ip_address,
        "manufacturer": "",
        "model": "",
        "serial_number": "",
        "mac_address": "",
        "apparent_power_oid": ""
    }
    
    # Check availability of SNMP tools
    if not PYSNMP_AVAILABLE:
        try:
            subprocess.run(
                ["snmpget", "--version"],
                capture_output=True,
                text=True,
                timeout=2
            )
        except FileNotFoundError:
            pdu_info["error"] = "SNMP tools not found. Install: pip install pysnmp"
            return pdu_info
    
    # Try each manufacturer's OIDs
    for manufacturer_key, oids in PDU_MANUFACTURERS.items():
        # Query manufacturer OID first to identify the PDU type
        mfg_response = snmp_query(hostname, oids["manufacturer"], v2c)
        
        if mfg_response:
            # Special handling for Enlogic: detect keyword in response
            if manufacturer_key == "enlogic":
                if "Enlogic" in mfg_response:
                    # Keyword detected, hardcode manufacturer as "Enlogic"
                    pdu_info["manufacturer"] = "Enlogic"
                    logger.info(f"Enlogic PDU detected by keyword match for {hostname}")
                else:
                    # Keyword not found, skip this manufacturer
                    logger.debug(f"Enlogic keyword not found for {hostname}, trying next manufacturer")
                    continue
            else:
                # For other manufacturers, use the response as manufacturer name
                pdu_info["manufacturer"] = oids["display_name"]
            
            # Query model
            model = snmp_query(hostname, oids["model"], v2c)
            if model:
                pdu_info["model"] = model
            
            # Query serial number
            serial = snmp_query(hostname, oids["serial"], v2c)
            if serial:
                pdu_info["serial_number"] = serial
            
            # Query MAC address
            mac = snmp_query(hostname, oids["mac_address"], v2c)
            if mac:
                pdu_info["mac_address"] = mac
            
            # Store the OID only after the detected manufacturer matches a known profile.
            pdu_info["apparent_power_oid"] = resolve_apparent_power_oid(
                pdu_info["manufacturer"]
            )
            
            logger.info(f"Successfully extracted info for {hostname}: {pdu_info['manufacturer']}")
            return pdu_info
    
    # No valid manufacturer OIDs found
    pdu_info["error"] = "Unable to determine PDU manufacturer - no valid SNMP responses"
    logger.warning(f"Could not determine manufacturer for {hostname}")
    return pdu_info


def extract_pdu_batch(hostnames: List[str], v2c: str = "amd123") -> List[Dict]:
    """Extract PDU information for multiple hostnames."""
    results = []
    for hostname in hostnames:
        pdu_info = extract_pdu_info(hostname, "", v2c)
        results.append(pdu_info)
    return results


@pdu.route("", methods=["GET"])
def get_pdu_info():
    """
    Retrieve PDU information from database by hostname.
    
    Query parameters:
    - hostname: PDU hostname or FQDN (required)
    
    Example: GET /api/pdu?hostname=pdu-odcdh3-b12-1.amd.com
    """
    try:
        hostname = request.args.get("hostname")
        
        if not hostname:
            return jsonify({
                "status": "error",
                "message": "Missing required query parameter: hostname"
            }), 400
        
        collection = Database().db["pdu_test"]
        
        # Retrieve PDU record from database
        pdu_record = collection.find_one({"hostname": hostname})
        
        if not pdu_record:
            return jsonify({
                "status": "error",
                "hostname": hostname,
                "message": f"PDU hostname '{hostname}' not found in database",
                "timestamp": datetime.now().isoformat()
            }), 404
        
        # Prepare response with all fields
        created = pdu_record.get("created")
        updated = pdu_record.get("updated")
        
        if hasattr(created, "isoformat"):
            created = created.isoformat()
        if hasattr(updated, "isoformat"):
            updated = updated.isoformat()
        
        return jsonify({
            "status": "success",
            "hostname": hostname,
            "pdu_info": {
                "hostname": pdu_record.get("hostname"),
                "ip_address": pdu_record.get("ip_address", ""),
                "manufacturer": pdu_record.get("manufacturer", ""),
                "model": pdu_record.get("model", ""),
                "serial_number": pdu_record.get("serial_number", ""),
                "mac_address": pdu_record.get("mac_address", ""),
                "apparent_power_oid": pdu_record.get("apparent_power_oid", ""),
                "site": pdu_record.get("site", ""),
                "data_hall": pdu_record.get("data_hall", ""),
                "rack": pdu_record.get("rack", ""),
                "level": pdu_record.get("level", ""),
                "locale": pdu_record.get("locale", ""),
                "created": created,
                "updated": updated
            },
            "database_info": {
                "created": created,
                "updated": updated,
                "source": "lab-monitoring.pdu_test",
                "collection": "lab-monitoring.pdu_test"
            },
            "timestamp": datetime.now().isoformat()
        })
    
    except Exception as error:
        hostname = request.args.get("hostname", "unknown")
        return jsonify({
            "status": "error",
            "hostname": hostname,
            "message": str(error),
            "timestamp": datetime.now().isoformat()
        }), 500


# ============================================================================
# HELPER FUNCTIONS FOR PARALLEL PDU SYNC
# ============================================================================

def extract_pdu_info_with_retry(hostname: str, ip_address: str, v2c: str = "amd123", max_retries: int = 3) -> dict:
    """
    Extract PDU information via SNMP with automatic retry logic.
    
    Retries up to max_retries times on transient failures.
    Returns dict with 'error' key if all retries fail.
    """
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            result = extract_pdu_info(hostname, ip_address=ip_address, v2c=v2c)
            
            # Check if result contains error
            if isinstance(result, dict) and "error" in result:
                last_error = result.get("error", "Unknown error")
                if attempt < max_retries:
                    time.sleep(0.5)  # Wait before retry
                    continue
                else:
                    return result  # Return error on last attempt
            
            return result  # Success
            
        except Exception as e:
            last_error = str(e)
            if attempt < max_retries:
                time.sleep(0.5)  # Wait before retry
                continue
            else:
                return {"error": f"SNMP extraction failed after {max_retries} retries: {last_error}"}
    
    return {"error": last_error or "Unknown error"}


def update_single_pdu(hostname: str, collection, now: datetime, v2c: str = "amd123") -> dict:
    """
    Update a single PDU record with extracted information and metadata.
    
    Ensures all required fields exist in the record.
    
    Returns dict with: success (bool), reason (str if failed), details (dict)
    """
    try:
        # Get existing PDU record
        pdu_record = collection.find_one({"hostname": hostname})
        if not pdu_record:
            return {
                "success": False,
                "reason": "PDU record not found in database",
                "hostname": hostname
            }
        
        # Initialize update_data with required fields if missing
        update_data = {"updated": now}
        
        # Ensure all required fields exist in the record
        required_fields = {
            "manufacturer": "",
            "model": "",
            "serial_number": "",
            "mac_address": "",
            "apparent_power_oid": "",
            "site": "",
            "data_hall": "",
            "rack": "",
            "level": "",
            "locale": ""
        }
        
        for field, default_value in required_fields.items():
            if field not in pdu_record:
                update_data[field] = default_value
        
        # Extract PDU information via SNMP with retry
        pdu_info = extract_pdu_info_with_retry(
            hostname,
            ip_address=pdu_record.get("ip_address", ""),
            v2c=v2c,
            max_retries=3
        )
        
        # Parse hostname to extract infrastructure metadata (always do this, SNMP-independent)
        metadata = parse_hostname_metadata(hostname)
        
        # Add extracted metadata
        if metadata:
            update_data.update({
                "site": metadata.get("site", ""),
                "data_hall": metadata.get("data_hall", ""),
                "rack": metadata.get("rack", ""),
                "level": metadata.get("level", ""),
                "locale": metadata.get("locale", "")
            })

        # Skip SNMP enrichment only on Windows and surface a clear notice.
        if isinstance(pdu_info, dict) and pdu_info.get("snmp_skipped"):
            update_data.update({
                "manufacturer": "",
                "model": "",
                "serial_number": "",
                "mac_address": "",
                "apparent_power_oid": "",
            })
            notice = pdu_info.get("notice", get_snmp_platform_notice())
            logger.warning("SNMP enrichment skipped for %s on %s. %s", hostname, platform.system(), notice)
        elif isinstance(pdu_info, dict) and "error" in pdu_info:
            if platform.system() == "Windows":
                return {
                    "success": True,
                    "hostname": hostname,
                    "snmp_skipped": True,
                    "notice": get_snmp_platform_notice(),
                    "details": {
                        "ip_address": pdu_record.get("ip_address", "N/A"),
                        "manufacturer": "N/A",
                        "model": "N/A",
                        "serial_number": "N/A",
                        "mac_address": "N/A",
                        "apparent_power_oid": "N/A",
                        "site": metadata.get("site", "N/A"),
                        "data_hall": metadata.get("data_hall", "N/A"),
                        "rack": metadata.get("rack", "N/A"),
                        "level": metadata.get("level", "N/A"),
                        "locale": metadata.get("locale", "N/A")
                    }
                }
            return {
                "success": False,
                "hostname": hostname,
                "reason": pdu_info.get("error", "SNMP extraction failed"),
            }
        else:
            # SNMP extraction succeeded
            update_data.update({
                "manufacturer": pdu_info.get("manufacturer", ""),
                "model": pdu_info.get("model", ""),
                "serial_number": pdu_info.get("serial_number", ""),
                "mac_address": pdu_info.get("mac_address", ""),
                "apparent_power_oid": pdu_info.get("apparent_power_oid", "")
            })
        
        # Ensure ip_address is preserved (from network scan step)
        if "ip_address" not in update_data and pdu_record.get("ip_address"):
            update_data["ip_address"] = pdu_record.get("ip_address")
        
        # Update database record with all fields
        collection.update_one(
            {"hostname": hostname},
            {"$set": update_data}
        )
        
        # Get updated record for response
        updated_record = collection.find_one({"hostname": hostname})
        
        return {
            "success": True,
            "hostname": hostname,
            "details": {
                "ip_address": updated_record.get("ip_address", "N/A"),
                "manufacturer": updated_record.get("manufacturer", "N/A"),
                "model": updated_record.get("model", "N/A"),
                "serial_number": updated_record.get("serial_number", "N/A"),
                "mac_address": updated_record.get("mac_address", "N/A"),
                "apparent_power_oid": updated_record.get("apparent_power_oid", "N/A"),
                "site": updated_record.get("site", "N/A"),
                "data_hall": updated_record.get("data_hall", "N/A"),
                "rack": updated_record.get("rack", "N/A"),
                "level": updated_record.get("level", "N/A"),
                "locale": updated_record.get("locale", "N/A")
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "reason": str(e),
            "hostname": hostname
        }


def populate_apparent_power_oids(collection) -> dict:
    """
    Populate apparent_power_oid field for all PDU records based on manufacturer.
    
    This function ensures all PDU records have the hardcoded apparent_power OID
    based on their detected manufacturer. Called after SNMP extraction to backfill
    any records that now have manufacturer info.
    
    Args:
        collection: MongoDB collection reference
    
    Returns:
        dict with migration statistics: {
            "total_processed": int,
            "updated": int,
            "skipped": int,
            "errors": int
        }
    """
    stats = {
        "total_processed": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0
    }
    
    try:
        now = datetime.now()
        pdu_records = list(collection.find({}))
        stats["total_processed"] = len(pdu_records)
        
        for record in pdu_records:
            hostname = record.get("hostname", "unknown")
            manufacturer = record.get("manufacturer", "")
            
            # Resolve from the manufacturer every time so stale or mismatched OIDs are cleared.
            apparent_power_oid = resolve_apparent_power_oid(manufacturer)

            if record.get("apparent_power_oid") == apparent_power_oid:
                stats["skipped"] += 1
                continue
            
            # Update the record
            try:
                collection.update_one(
                    {"_id": record["_id"]},
                    {
                        "$set": {
                            "apparent_power_oid": apparent_power_oid,
                            "updated": now
                        }
                    }
                )
                stats["updated"] += 1
            except Exception as e:
                print(f"[ERROR] Failed to update {hostname}: {str(e)}")
                stats["errors"] += 1
        
        return stats
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")
        stats["errors"] += 1
        return stats


@pdu.route("/sync-all", methods=["POST"])
def sync_all_pdus():
    """
    Manually trigger full PDU synchronization and metadata extraction.
    
    This endpoint always performs a complete rescan:
    1. Scans network for PDU devices (fresh network scan)
    2. Creates/updates PDU records with hostname and IP
    3. Extracts manufacturer info via SNMP
    4. Parses hostname to extract infrastructure metadata (site, data_hall, rack, level, locale)
    5. Updates all PDU records in the database
    
    Request body: (empty POST request)
    
    Example: POST /api/pdu/sync-all
    """
    try:
        print("\n" + "=" * 80)
        print("[*] Starting PDU synchronization via API")
        print("=" * 80)
        
        collection = Database().db["pdu_test"]
        
        # Step 1: Create/update PDU records with hostname and IP
        print("\n[*] Step 1: Scanning for PDUs and syncing hostname/IP records...")
        
        result = scan_network_pdus(
            parse_nmap_output,
            filter_ignored_devices,
            is_windows_with_scanner_service,
            get_scanner_service_url,
        )
        scan_error = ""
        
        if result.get("status") == "error":
            # Network scan failed - log warning but continue with existing records
            scan_error = result.get('message', 'Unknown error')
            print(f"[WARN] Network scan failed: {scan_error}")
            print("[WARN] Will proceed with existing PDU records from database")
        else:
            scan_message = result.get("message", "")
            if any(keyword in scan_message.lower() for keyword in ("failed", "timed out", "not found")):
                scan_error = scan_message
        
        saved_pdus = []
        now = datetime.now()
        
        # Save scanned PDUs to database
        for device in result.get("pdus", []):
            hostname = device.get("hostname")
            ip_address = device.get("ip_address") or device.get("ip") or ""
            if not hostname or not ip_address:
                continue
            
            existing = collection.find_one({"hostname": hostname})
            
            if existing:
                existing_ip = existing.get("ip_address")
                if existing_ip != ip_address:
                    collection.update_one(
                        {"hostname": hostname},
                        {"$set": {"ip_address": ip_address, "updated": now}}
                    )
                    saved_pdus.append(hostname)
            else:
                # Initialize new PDU record with all required fields
                collection.insert_one({
                    "hostname": hostname,
                    "ip_address": ip_address,
                    # SNMP extracted fields (initialized as empty)
                    "manufacturer": "",
                    "model": "",
                    "serial_number": "",
                    "mac_address": "",
                    "apparent_power_oid": "",
                    # Metadata fields (will be populated by parse_hostname_metadata)
                    "site": "",
                    "data_hall": "",
                    "rack": "",
                    "level": "",
                    "locale": "",
                    # Timestamps
                    "created": now,
                    "updated": now,
                })
                saved_pdus.append(hostname)
        
        pdu_count = len(saved_pdus)
        print(f"[OK] Processed {pdu_count} PDU records from network scan")
        
        # Get list of hostnames to update
        hostnames = saved_pdus if saved_pdus else []
        
        # If no PDUs found from network scan, fetch all PDUs from database
        if pdu_count == 0:
            print("[WARN] No new PDU records from network scan, fetching all PDUs from database...")
            try:
                existing_pdus = collection.find({})
                hostnames = [pdu.get('hostname') for pdu in existing_pdus if pdu.get('hostname')]
                pdu_count = len(hostnames)
                print(f"[INFO] Found {pdu_count} existing PDU records in database")
            except Exception as db_error:
                print(f"[WARN] Could not fetch PDUs from database: {db_error}")
                hostnames = []
        
        if not hostnames:
            print("[WARN] No PDU records to process")
            if scan_error:
                return jsonify({
                    "status": "error",
                    "message": scan_error,
                    "sync_result": {
                        "status": "error",
                        "message": "Network scan failed and no existing PDU records were available",
                        "pdu_count": 0,
                        "successful_updates": 0,
                        "failed_updates": 0
                    },
                    "timestamp": datetime.now().isoformat()
                }), 503
            return jsonify({
                "status": "success",
                "message": "PDU sync completed with 0 records",
                "sync_result": {
                    "status": "success",
                    "message": "No PDU records to sync",
                    "pdu_count": 0,
                    "successful_updates": 0,
                    "failed_updates": 0
                }
            }), 200
        
        print(f"[LIST] PDU hostnames to update: {len(hostnames)} total")
        
        # Step 2: Extract and update PDU information for each hostname (PARALLEL PROCESSING)
        print("\n[*] Step 2: Extracting PDU information and updating database (parallel processing)...")
        
        sync_start_time = time.time()
        successful_updates = 0
        failed_updates = 0
        failed_pdus = []  # Track failed PDUs with reasons
        
        # Use ThreadPoolExecutor for parallel processing
        # Adjust max_workers based on system load (default: 5 concurrent updates)
        max_workers = min(5, len(hostnames))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_hostname = {
                executor.submit(update_single_pdu, hostname, collection, now, "amd123"): hostname
                for hostname in hostnames
            }
            
            # Process completed tasks as they finish
            completed_count = 0
            for future in as_completed(future_to_hostname):
                hostname = future_to_hostname[future]
                completed_count += 1
                
                try:
                    result = future.result()
                    
                    if result.get("success"):
                        successful_updates += 1
                        details = result.get("details", {})
                        print(f"\n  [{completed_count}/{pdu_count}] [OK] {hostname}")
                        print(f"       Manufacturer: {details.get('manufacturer', 'N/A')}")
                        print(f"       Model: {details.get('model', 'N/A')}")
                        print(f"       Serial: {details.get('serial_number', 'N/A')}")
                        print(f"       MAC: {details.get('mac_address', 'N/A')}")
                        print(f"       Site: {details.get('site', 'N/A')}")
                        print(f"       DataHall: {details.get('data_hall', 'N/A')}")
                        print(f"       Rack: {details.get('rack', 'N/A')}")
                        print(f"       Level: {details.get('level', 'N/A')}")
                        print(f"       Locale: {details.get('locale', 'N/A')}")
                    else:
                        failed_updates += 1
                        reason = result.get("reason", "Unknown error")
                        failed_pdus.append({
                            "hostname": hostname,
                            "reason": reason
                        })
                        print(f"\n  [{completed_count}/{pdu_count}] [ERROR] {hostname}")
                        print(f"       Reason: {reason}")
                        
                except Exception as e:
                    failed_updates += 1
                    error_msg = str(e)
                    failed_pdus.append({
                        "hostname": hostname,
                        "reason": error_msg
                    })
                    print(f"\n  [{completed_count}/{pdu_count}] [ERROR] {hostname}")
                    print(f"       Reason: {error_msg}")
        
        sync_duration = time.time() - sync_start_time
        
        # Step 3: Populate apparent_power_oid for all records based on manufacturer
        print("\n[*] Step 3: Populating apparent_power_oid field for all PDU records...")
        migration_stats = populate_apparent_power_oids(collection)
        print(f"[OK] Migration complete: {migration_stats['updated']} updated, {migration_stats['skipped']} skipped, {migration_stats['errors']} errors")
        
        # Summary
        platform_notice = get_snmp_platform_notice()
        print("\n" + "=" * 80)
        print("[SUMMARY] PDU Synchronization Summary:")
        print(f"  Total PDUs processed: {pdu_count}")
        print(f"  Successfully updated: {successful_updates}")
        print(f"  Failed updates: {failed_updates}")
        print(f"  Success rate: {(successful_updates/pdu_count*100):.1f}%" if pdu_count > 0 else "  Success rate: N/A")
        print(f"  Execution time: {sync_duration:.2f} seconds")
        print(f"  Platform: {platform.system()}")
        print(f"  SNMP notice: {platform_notice}")
        print(f"\n  Apparent Power OID Migration:")
        print(f"    Records processed: {migration_stats['total_processed']}")
        print(f"    Records updated: {migration_stats['updated']}")
        print(f"    Records skipped: {migration_stats['skipped']}")
        print("=" * 80)

        status_message = "PDU synchronization completed successfully"
        if platform.system() == "Windows":
            status_message = (
                "PDU synchronization completed with SNMP OID-based metadata extraction skipped "
                "on Windows (manufacturer, model, serial number, MAC address, and apparent_power_oid)"
            )

        return jsonify({
            "status": "success",
            "message": status_message,
            "notice": platform_notice,
            "platform": platform.system(),
            "sync_result": {
                "status": "success",
                "message": f"PDU sync completed: {successful_updates}/{pdu_count} records updated",
                "pdu_count": pdu_count,
                "successful_updates": successful_updates,
                "failed_updates": failed_updates,
                "success_rate": f"{(successful_updates/pdu_count*100):.1f}%" if pdu_count > 0 else "N/A",
                "execution_time_seconds": round(sync_duration, 2),
                "failed_pdus": failed_pdus,
                "snmp_notice": platform_notice,
                "migration": {
                    "apparent_power_oid": {
                        "total_processed": migration_stats["total_processed"],
                        "updated": migration_stats["updated"],
                        "skipped": migration_stats["skipped"],
                        "errors": migration_stats["errors"]
                    }
                }
            },
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        error_msg = f"Error during PDU synchronization: {str(e)}"
        print(f"Error: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now().isoformat()
        }), 500


def parse_hostname_metadata(hostname: str) -> dict:
    """
    Parse PDU hostname to extract infrastructure metadata.
    
    Hostname patterns handled:
    1. pdu-{site}{datahall}-{rack}-{level}[.domain]
       Examples: pdu-odcdh3-b12-1.amd.com, pdu-odcdh1-a12-2.amd.com
    2. pdu-{site}{datahall}-{rack}[.domain] (level defaults to "1")
       Examples: pdu-odcdh5-d3.amd.com, pdu-odcdh1-a12.amd.com
    3. Edge cases handled with defaults
    
    Returns dict with guaranteed non-empty values for: site, data_hall, rack, level, locale
    """
    locale_mapping = {
        "odc": "Penang",
    }
    
    try:
        if not hostname.startswith("pdu-"):
            print(f"[PARSE] Invalid hostname format: {hostname} (missing pdu- prefix)")
            return {
                "site": "unknown",
                "data_hall": "unknown",
                "rack": "unknown",
                "level": "1",
                "locale": "Unknown"
            }
        
        # Remove 'pdu-' prefix
        hostname_part = hostname[4:]
        
        # Remove domain suffix (.amd.com, etc.)
        if '.' in hostname_part:
            hostname_part = hostname_part.split('.')[0]
        
        # Split by hyphens
        parts = hostname_part.split("-")
        
        # Need at least 2 parts: site+datahall and rack
        if len(parts) < 2:
            print(f"[PARSE] Insufficient hostname parts: {hostname} (got {len(parts)}, need 2+)")
            return {
                "site": "unknown",
                "data_hall": "unknown",
                "rack": "unknown",
                "level": "1",
                "locale": "Unknown"
            }
        
        # Extract site and data_hall from first part
        first_part = parts[0].lower()
        site = ""
        data_hall = ""
        
        if first_part.startswith("odc"):
            site = "odc"
            data_hall = first_part[3:].lower() if len(first_part) > 3 else "unknown"
        elif first_part.startswith("sg"):
            site = "sg"
            data_hall = first_part[2:].lower() if len(first_part) > 2 else "unknown"
        elif first_part.startswith("us"):
            site = "us"
            data_hall = first_part[2:].lower() if len(first_part) > 2 else "unknown"
        elif first_part.startswith("eu"):
            site = "eu"
            data_hall = first_part[2:].lower() if len(first_part) > 2 else "unknown"
        else:
            print(f"[PARSE] Unknown site code in: {hostname} (first_part={first_part})")
            return {
                "site": "unknown",
                "data_hall": "unknown",
                "rack": "unknown",
                "level": "1",
                "locale": "Unknown"
            }
        
        # Extract rack from second part
        rack = parts[1].lower()
        if '.' in rack:
            rack = rack.split('.')[0]
        
        # Extract level from third part if it exists, otherwise default to "1"
        level = "1"
        if len(parts) >= 3:
            level = parts[2]
            if '.' in level:
                level = level.split('.')[0]
        
        # Determine locale from site code
        locale = locale_mapping.get(site, "Unknown")
        
        result = {
            "site": site if site else "unknown",
            "data_hall": data_hall if data_hall else "unknown",
            "rack": rack if rack else "unknown",
            "level": str(level) if level else "1",
            "locale": locale if locale else "Unknown"
        }
        
        print(f"[PARSE] Hostname '{hostname}' -> Site: {result['site']}, DataHall: {result['data_hall']}, Rack: {result['rack']}, Level: {result['level']}, Locale: {result['locale']}")
        return result
        
    except Exception as e:
        print(f"[PARSE] Error parsing hostname {hostname}: {e}")
        return {
            "site": "unknown",
            "data_hall": "unknown",
            "rack": "unknown",
            "level": "1",
            "locale": "Unknown"
        }
