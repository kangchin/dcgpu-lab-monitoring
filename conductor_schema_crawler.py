#!/usr/bin/env python3
"""
Conductor Inventory Search CLI (SDK, environment-compatible)

- Finds systems with 'png' in:
  - system_datas.name
  - OR system_maas_data.fqdn
- Uses server-side partial matching where supported
- Hydrates only candidate systems
"""

import os
from dotenv import load_dotenv

from at_scale_python_api.database import SYSTEM_DB_CONTROLLER
from at_scale_python_api.backend.systems import SystemController
from ats_models.pydantic.conductor_query import ConductorQuery


# ---------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))

SEARCH_TERM = "png"
PAGE_SIZE = 200


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def fetch_candidate_systems():
    """
    Fetch candidate systems using server-side partial matching.
    This avoids downloading the full database.
    """
    candidates = {}

    # Match against system name
    by_name = SYSTEM_DB_CONTROLLER.get(
        name=SEARCH_TERM,
        partial_match=True,
        items_per_page=PAGE_SIZE,
    ) or []

    # Match against hostname / IP (best server-side proxy for FQDN)
    by_hostname = SYSTEM_DB_CONTROLLER.get(
        hostname_ip=SEARCH_TERM,
        partial_match=True,
        items_per_page=PAGE_SIZE,
    ) or []

    for sys in by_name + by_hostname:
        candidates[sys.id] = sys

    return list(candidates.values())


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
def main():
    candidates = fetch_candidate_systems()

    sys_ctrl = SystemController()
    matches = []

    for stub in candidates:
        systems = sys_ctrl.get(ConductorQuery(id=stub.id))
        if not systems:
            continue

        system = systems[0]

        name = system.system_datas.name.lower()
        fqdn = ""

        if system.system_maas_data and system.system_maas_data.fqdn:
            fqdn = system.system_maas_data.fqdn.lower()

        if SEARCH_TERM in name or SEARCH_TERM in fqdn:
            matches.append(system)

    print(f"\nSystems matching '{SEARCH_TERM}' in name or FQDN:\n")

    for system in matches:
        fqdn = (
            system.system_maas_data.fqdn
            if system.system_maas_data and system.system_maas_data.fqdn
            else "<none>"
        )

        print(f"System: {system.system_datas.name}")
        print(f"FQDN  : {fqdn}")
        print(f"ID    : {system.id}\n")

    print(f"Total matches: {len(matches)}")


if __name__ == "__main__":
    main()