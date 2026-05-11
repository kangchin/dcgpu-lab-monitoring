#!/usr/bin/env python3
"""
Conductor Inventory CLI (SDK, schema-correct, final)

- Filters systems where system_datas.name contains "odcdh" (case-insensitive)
- Credentials from: system_datas.platform_config
- Connection type from: system_device_data.power_distribution[*].type
- Uses fixed SDK Pydantic models (pass <-> password)

NOTE:
Some systems may fail SDK validation during hydration due to strict types
(e.g., power_controllers[0].ip = None while SDK expects str). We skip those
systems and continue.
"""

import os
from dotenv import load_dotenv
from pydantic import ValidationError

from at_scale_python_api.database import SYSTEM_DB_CONTROLLER
from at_scale_python_api.backend.systems import SystemController
from ats_models.pydantic.conductor_query import ConductorQuery


# ---------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))

MATCH_TERM = "odcdh"   # case-insensitive match on system name
PAGE_SIZE = 500


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def fetch_all_systems(page_size=PAGE_SIZE):
    systems = []
    page = 1
    while True:
        batch = SYSTEM_DB_CONTROLLER.get(
            page_num=page,
            items_per_page=page_size,
        )
        if not batch:
            break
        systems.extend(batch)
        page += 1
    return systems


def extract_conn_type(system):
    """
    ConnType lives in runtime device data:
    system.system_device_data.power_distribution[<pdu_host>].type
    """
    try:
        dev = system.system_device_data
        if not dev or not getattr(dev, "power_distribution", None):
            return None

        pd_runtime = dev.power_distribution  # typically dict keyed by hostname
        if isinstance(pd_runtime, dict) and pd_runtime:
            first = next(iter(pd_runtime.values()))
            if isinstance(first, dict):
                return first.get("type")  # confirmed in your data
            return getattr(first, "type", None)

    except Exception:
        return None

    return None


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
def main():
    # Step 1: stub-only scan
    stubs = fetch_all_systems()
    odcdh_stubs = [s for s in stubs if MATCH_TERM in (s.system_datas.name or "").lower()]

    print(f"\nTotal systems scanned (stubs): {len(stubs)}")
    print(f"Systems with '{MATCH_TERM}' in name: {len(odcdh_stubs)}\n")

    # Step 2: hydrate each matching system
    sys_ctrl = SystemController()

    processed = 0
    skipped_validation = 0

    for idx, stub in enumerate(odcdh_stubs, start=1):
        try:
            systems = sys_ctrl.get(ConductorQuery(id=stub.id))
            if not systems:
                continue

            system = systems[0]
            processed += 1

            print(f"{idx:4d}. System: {system.system_datas.name}")
            print(f"      Host/IP: {system.system_datas.hostname_ip}")

            # ================================================================
            # PLATFORM CONFIG (STATIC INTENT)
            # ================================================================
            cfg = system.system_datas.platform_config

            # ---- BMC ----
            print("      PLATFORM CONTROL")
            if cfg.power_controllers:
                bmc = cfg.power_controllers[0]
                print(f"        Type     : {bmc.type}")
                print(f"        IP       : {bmc.ip}")
                print(f"        User     : {bmc.user}")
                print(f"        Password : {bmc.password}")
            else:
                print("        <none defined>")

            # ---- PDU CONFIG ----
            print("      POWER DISTRIBUTION (CONFIG)")
            if cfg.power_distribution:
                pd_cfg = cfg.power_distribution[0]
                print(f"        Host     : {pd_cfg.hostname_ip_url}")
                print(f"        Outlet   : {pd_cfg.outlet}")
                print(f"        User     : {pd_cfg.user}")
                print(f"        Password : {pd_cfg.password}")
            else:
                print("        <none defined>")

            # ================================================================
            # SYSTEM DEVICE DATA (RUNTIME / DISCOVERED)
            # ================================================================
            conn_type = extract_conn_type(system)
            print("      POWER DISTRIBUTION (RUNTIME)")
            print(f"        ConnType : {conn_type}")
            print("")

        except ValidationError:
            skipped_validation += 1
            # Skip systems that fail strict SDK validation
            print(f"{idx:4d}. [SKIP] {stub.system_datas.name} (ValidationError during hydration)")
            continue

        except Exception as e:
            # Any other transient backend / SDK issue
            print(f"{idx:4d}. [SKIP] {stub.system_datas.name} (Error: {e})")
            continue

    print("Summary:")
    print(f"  Hydrated & printed : {processed}")
    print(f"  Skipped (validation): {skipped_validation}")
    print(f"  Total candidates   : {len(odcdh_stubs)}\n")


if __name__ == "__main__":
    main()