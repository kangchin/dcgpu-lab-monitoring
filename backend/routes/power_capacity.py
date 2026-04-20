import json
import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from dateutil.relativedelta import relativedelta
from utils.models.power import Power
from collections import defaultdict

power_capacity = Blueprint("power_capacity", __name__)

DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'power_capacity_data.json')

PLANNED_CAPACITY = {
    "odcdh1": 429,
    "odcdh2": 693,
    "odcdh3": 396,
    "odcdh4": 165,
    "odcdh5": 209
}

def ensure_data_directory():
    data_dir = os.path.dirname(DATA_FILE_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

def load_capacity_data():
    try:
        if os.path.exists(DATA_FILE_PATH):
            with open(DATA_FILE_PATH, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading capacity data: {e}")
        return []

def save_capacity_data(data):
    try:
        ensure_data_directory()
        with open(DATA_FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"Error saving capacity data: {e}")
        return False

def get_date_batches(start_date, end_date, max_days=7):
    batches = []
    current_start = start_date
    while current_start < end_date:
        current_end = min(current_start + timedelta(days=max_days), end_date)
        batches.append((current_start, current_end))
        current_start = current_end
    return batches

def query_power_in_batches(power_model, query_filter, start_date, end_date, max_days=7):
    adjusted_end_date = end_date + timedelta(days=1)
    batches = get_date_batches(start_date, adjusted_end_date, max_days)
    all_results = []
    for batch_start, batch_end in batches:
        batch_filter = query_filter.copy()
        batch_filter["created"] = {"$gte": batch_start, "$lt": batch_end}
        try:
            batch_results = power_model.find(batch_filter, sort=[("created", 1)])
            all_results.extend(batch_results)
        except Exception as e:
            print(f"Error querying batch {batch_start} to {batch_end}: {e}")
            continue
    return all_results

def calculate_live_capacity_for_month(start_date, end_date):
    """
    Full DB scan: used only on cold-start (Redis empty).
    Calculates live capacity = peak daily sum of per-system max readings.
    """
    sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
    power_model = Power()
    result = {"month": start_date.strftime("%B %Y")}
    column_map = {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3", "odcdh4": "dh4", "odcdh5": "dh5"}
    total_live_capacity = 0

    for site in sites:
        try:
            readings = query_power_in_batches(power_model, {"site": site}, start_date, end_date, max_days=3)
            if not readings:
                continue

            daily_system_readings = defaultdict(lambda: defaultdict(list))
            for reading in readings:
                try:
                    timestamp = reading.get("created")
                    if isinstance(timestamp, str):
                        timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    day_key = timestamp.date()
                    system = reading.get("system", reading.get("location", "unknown"))
                    daily_system_readings[day_key][system].append(reading.get("reading", 0))
                except Exception:
                    continue

            daily_sums = []
            for day, systems_data in daily_system_readings.items():
                day_sum = sum(max(power_readings) for power_readings in systems_data.values())
                daily_sums.append(day_sum)

            if daily_sums:
                live_capacity_kw = max(daily_sums) / 1000
                col = column_map[site]
                result[f"{col}_live"] = round(live_capacity_kw, 2)
                total_live_capacity += live_capacity_kw

        except Exception as e:
            print(f"Error calculating live capacity for {site}: {e}")
            continue

    result["total_live"] = round(total_live_capacity, 2)
    return result


def calculate_historical_max_capacity():
    """Read historical max from JSON file – O(months) but months is small."""
    historical_data = load_capacity_data()
    if not historical_data:
        return {}

    sites = ["dh1", "dh2", "dh3", "dh4", "dh5"]
    max_capacities = {}
    for site in sites:
        site_max = max(
            (m.get(f"{site}_live", 0) for m in historical_data),
            default=0
        )
        max_capacities[f"{site}_max"] = site_max

    max_capacities["total_max"] = sum(max_capacities.values())
    return max_capacities


def auto_save_previous_month():
    try:
        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)
        previous_month = first_day_previous.strftime("%B %Y")

        existing_data = load_capacity_data()
        if any(item.get('month') == previous_month for item in existing_data):
            return

        print(f"Auto-saving capacity data for {previous_month}")
        live_capacity_data = calculate_live_capacity_for_month(first_day_previous, first_day_current)
        historical_max = calculate_historical_max_capacity()

        capacity_data = {"month": previous_month}
        for site_key, col in {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3",
                               "odcdh4": "dh4", "odcdh5": "dh5"}.items():
            live = live_capacity_data.get(f"{col}_live", 0)
            hist = historical_max.get(f"{col}_max", 0)
            max_v = max(live, hist)
            capacity_data[f"{col}_planned"]   = PLANNED_CAPACITY[site_key]
            capacity_data[f"{col}_live"]      = live
            capacity_data[f"{col}_max"]       = max_v
            capacity_data[f"{col}_available"] = round(PLANNED_CAPACITY[site_key] - max_v, 2)

        capacity_data["total_planned"]   = sum(PLANNED_CAPACITY.values())
        capacity_data["total_live"]      = live_capacity_data.get("total_live", 0)
        capacity_data["total_max"]       = max(live_capacity_data.get("total_live", 0),
                                               historical_max.get("total_max", 0))
        capacity_data["total_available"] = round(
            capacity_data["total_planned"] - capacity_data["total_max"], 2
        )
        capacity_data["auto_saved"]  = True
        capacity_data["saved_date"]  = datetime.now().isoformat()

        existing_data.append(capacity_data)
        save_capacity_data(existing_data)

    except Exception as e:
        print(f"Error in auto-save previous month capacity: {e}")


@power_capacity.route("", methods=["GET"])
def get_capacity_data():
    try:
        auto_save_previous_month()
        data = load_capacity_data()
        return jsonify(data)
    except Exception as e:
        return {"status": "error", "data": str(e)}


@power_capacity.route("/current-previous", methods=["GET"])
def get_current_previous():
    """
    O(1) capacity response via Redis.

    The Celery worker tracks per-location daily max readings and rolls them
    into `cap:month_live:{site}:{YYYY-MM}` (in Watts) on every collection run.
    This endpoint reads those keys directly; it only touches MongoDB on the
    first ever request (cold-start) or after a Redis restart.
    """
    try:
        from utils.factory.redis_client import redis as r_client

        auto_save_previous_month()

        current_date       = datetime.now()
        first_day_current  = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)
        current_month      = current_date.strftime("%B %Y")
        previous_month     = first_day_previous.strftime("%B %Y")
        month_str          = first_day_current.strftime("%Y-%m")

        sites   = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        col_map = {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3",
                   "odcdh4": "dh4", "odcdh5": "dh5"}

        def redis_float(key):
            v = r_client.get(key)
            if v is None:
                return None
            return float(v.decode("utf-8") if isinstance(v, bytes) else v)

        # ── Step 1: read live capacities from Redis (O(1)) ───────────────────
        live_kw_by_col: dict = {}
        all_cached = True
        for site in sites:
            w = redis_float(f"cap:month_live:{site}:{month_str}")
            if w is None:
                all_cached = False
                break
            live_kw_by_col[col_map[site]] = round(w / 1000.0, 2)

        # ── Step 2: cold-start fallback – calculate from DB + seed Redis ─────
        if not all_cached:
            print("Capacity Redis miss – one-time DB scan, will cache result")
            live_data = calculate_live_capacity_for_month(first_day_current, current_date)
            for site in sites:
                col = col_map[site]
                kw  = live_data.get(f"{col}_live", 0)
                live_kw_by_col[col] = kw
                # Store in Watts (consistent with Celery writer)
                r_client.set(
                    f"cap:month_live:{site}:{month_str}",
                    str(kw * 1000),
                    ex=90 * 24 * 3600
                )

        # ── Step 3: historical max from JSON file (O(months), already fast) ──
        historical_max = calculate_historical_max_capacity()

        # ── Step 4: assemble current-month response ───────────────────────────
        current_data: dict = {"month": current_month}
        total_live = 0.0
        for site in sites:
            col      = col_map[site]
            planned  = PLANNED_CAPACITY[site]
            live_kw  = live_kw_by_col.get(col, 0.0)
            hist_max = historical_max.get(f"{col}_max", 0.0)
            max_kw   = max(live_kw, hist_max)

            current_data[f"{col}_planned"]   = planned
            current_data[f"{col}_live"]      = live_kw
            current_data[f"{col}_max"]       = max_kw
            current_data[f"{col}_available"] = round(planned - max_kw, 2)
            total_live += live_kw

        current_data["total_planned"]   = sum(PLANNED_CAPACITY.values())
        current_data["total_live"]      = round(total_live, 2)
        current_data["total_max"]       = round(
            max(total_live, historical_max.get("total_max", 0.0)), 2
        )
        current_data["total_available"] = round(
            current_data["total_planned"] - current_data["total_max"], 2
        )

        # ── Step 5: previous month from saved JSON (already O(1)) ────────────
        existing_data = load_capacity_data()
        previous_data = next(
            (item for item in existing_data if item["month"] == previous_month), None
        )

        return jsonify({"current": current_data, "previous": previous_data})

    except Exception as e:
        print(f"Error getting current/previous capacity: {e}")
        return {"status": "error", "message": str(e)}, 500


@power_capacity.route("/auto-save", methods=["POST"])
def trigger_auto_save():
    try:
        auto_save_previous_month()
        return {"status": "success", "message": "Auto-save completed"}
    except Exception as e:
        return {"status": "error", "data": str(e)}