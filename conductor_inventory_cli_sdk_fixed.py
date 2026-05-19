#!/usr/bin/env python3
"""
Conductor Inventory CLI (SDK, partial-hydration + tolerant output)

What you asked for:
- Do NOT skip an entry if full hydration fails validation.
- Only hydrate the fields that are needed.
- Print values that are "incorrect" (wrong type) as strings for the used fields.
- Ignore/avoid hydrating fields that are not used (e.g., system_states.utilization_*).

Strategy:
1) Fetch system stubs via SYSTEM_DB_CONTROLLER.get(...)
2) Filter stubs by MATCH_TERM in system name
3) Try to fetch "full" system using SystemController.get() but with a projection
   (only required fields) if ConductorQuery supports it.
4) If ValidationError happens anyway, fall back to stub and continue.
5) For used fields, if the type is unexpected, coerce to string and record warnings.

Outputs JSON lines (JSONL) by default.
"""

import os
import json
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from pydantic import ValidationError

from at_scale_python_api.database import SYSTEM_DB_CONTROLLER
from at_scale_python_api.backend.systems import SystemController
from ats_models.pydantic.conductor_query import ConductorQuery


# ---------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"), override=False)

MATCH_TERM = os.environ.get("CONDUCTOR_MATCH_TERM", "odcdh").lower()
PAGE_SIZE = int(os.environ.get("CONDUCTOR_PAGE_SIZE", "500"))

# Output:
#  - jsonl: one JSON object per line
#  - pretty: pretty-printed JSON
OUTPUT = os.environ.get("OUTPUT", "jsonl").lower()

# This list defines ONLY what we want/need.
# If the backend supports projection, we request only these.
NEEDED_FIELD_PATHS = [
    "id",
    "system_datas.name",
    "system_datas.platform_config.power_controllers",
    "system_device_data.power_distribution",
]


# ---------------------------------------------------------------------
# Safe access helpers (object + dict compatible)
# ---------------------------------------------------------------------

def is_mapping(x: Any) -> bool:
    return isinstance(x, dict)

def safe_get(obj: Any, path: str, default=None):
    """
    Safe nested getter supporting dicts and objects.
    path example: "system_datas.platform_config.power_controllers"
    """
    cur = obj
    for part in path.split("."):
        if cur is None:
            return default
        if is_mapping(cur):
            cur = cur.get(part, default)
        else:
            cur = getattr(cur, part, default)
    return cur

def coerce_used_value(value: Any, expected: Tuple[type, ...], field_name: str, warnings: List[str]):
    """
    If 'value' is not of an expected type (and not None), convert it to string and warn.
    """
    if value is None:
        return None
    if isinstance(value, expected):
        return value
    # Allow ints where str is expected (common for ports etc.)
    if expected == (str,) and isinstance(value, (int, float)):
        return str(value)
    warnings.append(f"{field_name}: unexpected type {type(value).__name__}; coerced to string")
    return str(value)

def parse_site_location(system_name: str) -> Tuple[Optional[str], Optional[str]]:
    parts = (system_name or "").split("-")
    site = parts[1] if len(parts) > 1 else None
    location = parts[2] if len(parts) > 2 else None
    return site, location


# ---------------------------------------------------------------------
# Extraction functions (ONLY fields we use)
# ---------------------------------------------------------------------

def extract_system_name(obj: Any) -> str:
    return (safe_get(obj, "system_datas.name") or "").strip()

def extract_bmc_creds(obj: Any, warnings: List[str]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Credentials from:
      system_datas.platform_config.power_controllers[0]
    Support pass <-> password mismatch:
      password / pass_ / pass

    Also: if types are wrong, we stringify and warn.
    """
    cfg = safe_get(obj, "system_datas.platform_config")
    pcs = safe_get(cfg, "power_controllers") if cfg else None
    if not pcs:
        return None, None, None

    pc0 = pcs[0]

    if isinstance(pc0, dict):
        ip = pc0.get("ip")
        user = pc0.get("user") or pc0.get("username")
        pwd = pc0.get("password") or pc0.get("pass_") or pc0.get("pass")
    else:
        ip = getattr(pc0, "ip", None)
        user = getattr(pc0, "user", None) or getattr(pc0, "username", None)
        pwd = (
            getattr(pc0, "password", None)
            or getattr(pc0, "pass_", None)
            or getattr(pc0, "pass", None)
        )

    ip = coerce_used_value(ip, (str,), "bmc_ip", warnings)
    user = coerce_used_value(user, (str,), "username", warnings)
    pwd = coerce_used_value(pwd, (str,), "password", warnings)
    return ip, user, pwd

def extract_conn_type(obj: Any, warnings: List[str]) -> Optional[str]:
    """
    Connection type from runtime device data:
      system_device_data.power_distribution[*].type

    Shapes vary:
      - dict mapping host->obj
      - list of objs
    """
    pd = safe_get(obj, "system_device_data.power_distribution")
    if not pd:
        return None

    conn_type = None

    if isinstance(pd, dict):
        for _, v in pd.items():
            t = safe_get(v, "type")
            if t:
                conn_type = t
                break
    elif isinstance(pd, list):
        for v in pd:
            t = safe_get(v, "type")
            if t:
                conn_type = t
                break
    else:
        conn_type = safe_get(pd, "type")

    conn_type = coerce_used_value(conn_type, (str,), "conn_type", warnings)
    return conn_type


# ---------------------------------------------------------------------
# Conductor query building (projection / selective hydration)
# ---------------------------------------------------------------------

def build_best_effort_query(system_id: str) -> ConductorQuery:
    """
    Create a ConductorQuery that requests only NEEDED_FIELD_PATHS if the model supports it.

    We don't know your exact ConductorQuery schema across environments, so we:
    - inspect which fields exist on ConductorQuery
    - try common knobs: fields, projection, include_fields
    - fall back to just id if nothing else works
    """
    # pydantic v2: model_fields; v1: __fields__
    model_fields = getattr(ConductorQuery, "model_fields", None) or getattr(ConductorQuery, "__fields__", None) or {}
    supported = set(model_fields.keys())

    # Common parameter names used by APIs/SDKs for projections
    candidate_kwargs = []
    if "fields" in supported:
        candidate_kwargs.append({"id": system_id, "fields": NEEDED_FIELD_PATHS})
    if "projection" in supported:
        candidate_kwargs.append({"id": system_id, "projection": NEEDED_FIELD_PATHS})
    if "include_fields" in supported:
        candidate_kwargs.append({"id": system_id, "include_fields": NEEDED_FIELD_PATHS})

    # Some SDKs use boolean flags that might reduce payload
    if "minimal" in supported:
        candidate_kwargs.append({"id": system_id, "minimal": True})
    if "lite" in supported:
        candidate_kwargs.append({"id": system_id, "lite": True})

    # Always try plain id last
    candidate_kwargs.append({"id": system_id})

    last_err = None
    for kwargs in candidate_kwargs:
        try:
            return ConductorQuery(**kwargs)
        except (TypeError, ValidationError) as e:
            last_err = e
            continue

    # If nothing worked (unlikely), try id only with positional-ish behavior
    if last_err:
        # Best possible fallback
        return ConductorQuery(id=system_id)


def format_validation_errors(err: ValidationError, limit: int = 60) -> List[str]:
    out = []
    try:
        errors = err.errors()
    except Exception:
        return [str(err)]
    for e in errors[:limit]:
        loc = e.get("loc", [])
        loc_str = ".".join(str(x) for x in loc) if loc else "<root>"
        msg = e.get("msg", "")
        typ = e.get("type", "")
        out.append(f"{loc_str}: {msg} ({typ})")
    if len(errors) > limit:
        out.append(f"... truncated {len(errors) - limit} more validation error(s)")
    return out


# ---------------------------------------------------------------------
# Fetch stubs
# ---------------------------------------------------------------------

def iter_system_stubs(items_per_page: int = PAGE_SIZE):
    page = 1
    while True:
        batch = SYSTEM_DB_CONTROLLER.get(page_num=page, items_per_page=items_per_page)
        if not batch:
            break
        for s in batch:
            yield s
        page += 1


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

def main():
    sys_ctrl = SystemController()

    total_candidates = 0
    hydrated_clean = 0
    hydrated_with_warnings = 0
    validation_fallbacks = 0

    for stub in iter_system_stubs(items_per_page=PAGE_SIZE):
        stub_name = (safe_get(stub, "system_datas.name") or "")
        if MATCH_TERM not in stub_name.lower():
            continue

        total_candidates += 1
        warnings: List[str] = []
        hydration_errors: List[str] = []
        used_source = "full"

        # Try: selective hydration (projection) to avoid unused fields
        system_obj = None
        try:
            q = build_best_effort_query(stub.id)
            full = sys_ctrl.get(q)
            if isinstance(full, list) and full:
                system_obj = full[0]
            elif full:
                system_obj = full
            else:
                # no result; use stub
                used_source = "stub"
                system_obj = stub
                warnings.append("full_fetch: empty response; using stub")

        except ValidationError as ve:
            # IMPORTANT: do NOT skip; use stub and log which fields failed
            used_source = "stub"
            system_obj = stub
            hydration_errors = format_validation_errors(ve)
            validation_fallbacks += 1

        except Exception as e:
            used_source = "stub"
            system_obj = stub
            hydration_errors = [f"hydration_exception: {type(e).__name__}: {e}"]
            validation_fallbacks += 1

        # Extract ONLY the needed fields (ignore everything else)
        system_name = extract_system_name(system_obj) or extract_system_name(stub) or stub_name
        system_name = coerce_used_value(system_name, (str,), "system", warnings) or ""

        site, location = parse_site_location(system_name)

        bmc_ip, username, password = extract_bmc_creds(system_obj, warnings)
        # fallback to stub if needed
        if bmc_ip is None and username is None and password is None:
            bmc_ip, username, password = extract_bmc_creds(stub, warnings)

        conn_type = extract_conn_type(system_obj, warnings)
        if conn_type is None:
            conn_type = extract_conn_type(stub, warnings)

        record = {
            "system": system_name,
            "site": site,
            "location": location,
            "bmc_ip": bmc_ip,
            "username": username,
            "password": password,
            "conn_type": conn_type,

            # Visibility:
            "source": used_source,                # "full" or "stub"
            "warnings": warnings,                 # wrong types for USED fields → coerced to str
            "hydration_errors": hydration_errors, # validation errors (often in unused fields)
        }

        # Counters
        if hydration_errors:
            # full hydration failed, but record printed anyway
            hydrated_with_warnings += 1
        elif warnings:
            hydrated_with_warnings += 1
        else:
            hydrated_clean += 1

        # Print
        if OUTPUT == "pretty":
            print(json.dumps(record, indent=2, ensure_ascii=False))
        else:
            print(json.dumps(record, ensure_ascii=False))

    print("\nSummary:")
    print(f"  Hydrated & printed (clean)     : {hydrated_clean}")
    print(f"  Printed (warnings/errors)      : {hydrated_with_warnings}")
    print(f"  Used stub due to validation/etc: {validation_fallbacks}")
    print(f"  Total candidates               : {total_candidates}")


if __name__ == "__main__":
    main()