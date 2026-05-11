#!/usr/bin/env python3
"""
Find systems with 'png' in system name OR fqdn-like hostname.

- Stub-only mode (default): fast + no SDK validation crashes
- Optional hydrate mode: fetch full System objects to read system_maas_data.fqdn
- Prints total runtime + per-phase timings
"""

import os
import time
from dotenv import load_dotenv
from pydantic import ValidationError

from at_scale_python_api.database import SYSTEM_DB_CONTROLLER
from at_scale_python_api.backend.systems import SystemController
from ats_models.pydantic.conductor_query import ConductorQuery


# ----------------------------
# Config
# ----------------------------
SEARCH_TERM = "odcdh"
ITEMS_PER_PAGE = 500

# Set True only if you need system_maas_data.fqdn specifically.
HYDRATE_FOR_MAAS_FQDN = False


# ----------------------------
# Environment
# ----------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))


# ----------------------------
# Helpers
# ----------------------------
def iter_system_stubs(items_per_page=ITEMS_PER_PAGE):
    """Yield lightweight system stubs page-by-page."""
    page = 1
    while True:
        batch = SYSTEM_DB_CONTROLLER.get(page_num=page, items_per_page=items_per_page)
        if not batch:
            break
        for s in batch:
            yield s
        page += 1


def contains_term_in_stub(stub, term):
    """Check term in stub name OR stub hostname_ip (case-insensitive)."""
    term = term.lower()
    name = (stub.system_datas.name or "").lower()
    host = (stub.system_datas.hostname_ip or "").lower()
    return (term in name) or (term in host)


# ----------------------------
# Main
# ----------------------------
def main():
    start_total = time.perf_counter()

    term = SEARCH_TERM.lower()
    sys_ctrl = SystemController() if HYDRATE_FOR_MAAS_FQDN else None

    matches = []
    hydrated_ok = 0
    hydrated_skips = 0
    scanned = 0

    # Phase timing
    start_scan = time.perf_counter()

    for stub in iter_system_stubs():
        scanned += 1

        # Fast, safe filter using stub only
        if not contains_term_in_stub(stub, term):
            continue

        fqdn = "<stub-hostname_ip>"
        if HYDRATE_FOR_MAAS_FQDN:
            # Hydration timing is counted separately
            start_h = time.perf_counter()
            try:
                systems = sys_ctrl.get(ConductorQuery(id=stub.id))
                if not systems:
                    continue
                system = systems[0]
                hydrated_ok += 1

                fqdn = (
                    system.system_maas_data.fqdn
                    if system.system_maas_data and system.system_maas_data.fqdn
                    else "<none>"
                )

            except ValidationError:
                hydrated_skips += 1
                fqdn = "<hydration_failed>"
            except Exception:
                hydrated_skips += 1
                fqdn = "<hydration_failed>"
            finally:
                # store per-hydration elapsed if you want later
                _ = time.perf_counter() - start_h

        matches.append({
            "id": stub.id,
            "name": stub.system_datas.name,
            "hostname_ip": stub.system_datas.hostname_ip,
            "fqdn": fqdn,
        })

    end_scan = time.perf_counter()
    scan_elapsed = end_scan - start_scan

    # Output
    print(f"\nScanned stubs: {scanned}")
    print(f"Matches (stub filter): {len(matches)}")

    if HYDRATE_FOR_MAAS_FQDN:
        print(f"Hydrated OK: {hydrated_ok}")
        print(f"Hydration skipped (validation/other errors): {hydrated_skips}")

    print(f"\nSystems matching '{SEARCH_TERM}' in name OR hostname_ip:\n")
    for m in matches:
        print(f"- Name : {m['name']}")
        print(f"  Host : {m['hostname_ip']}")
        if HYDRATE_FOR_MAAS_FQDN:
            print(f"  FQDN : {m['fqdn']}")
        print(f"  ID   : {m['id']}\n")

    total_elapsed = time.perf_counter() - start_total

    print("Timing:")
    print(f"  Scan/filter time : {scan_elapsed:.3f} seconds")
    print(f"  Total runtime    : {total_elapsed:.3f} seconds\n")


if __name__ == "__main__":
    main()