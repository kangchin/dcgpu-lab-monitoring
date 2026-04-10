# backend/routes/monthly_data.py
import json
import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from dateutil.relativedelta import relativedelta
from utils.models.power import Power

monthly_data = Blueprint("monthly_data", __name__)

# Path to store the JSON file
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'monthly_power_data.json')

def ensure_data_directory():
    """Ensure the data directory exists"""
    data_dir = os.path.dirname(DATA_FILE_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

def load_monthly_data():
    """Load monthly data from JSON file"""
    try:
        if os.path.exists(DATA_FILE_PATH):
            with open(DATA_FILE_PATH, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading monthly data: {e}")
        return []

def save_monthly_data(data):
    """Save monthly data to JSON file"""
    try:
        ensure_data_directory()
        with open(DATA_FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"Error saving monthly data: {e}")
        return False

def get_date_batches(start_date, end_date, max_days=7):
    """Split a date range into batches of max_days or less"""
    batches = []
    current_start = start_date

    while current_start < end_date:
        current_end = min(current_start + timedelta(days=max_days), end_date)
        batches.append((current_start, current_end))
        current_start = current_end

    return batches

def query_power_data_for_month(site, start_date, end_date):
    """Query power data for a specific month using batched queries"""
    power = Power()
    all_readings = []

    adjusted_end_date = end_date + timedelta(days=1)
    batches = get_date_batches(start_date, adjusted_end_date)

    print(f"Querying {site} from {start_date} to {end_date} in {len(batches)} batches")

    for batch_start, batch_end in batches:
        try:
            query_filter = {
                "site": site,
                "created": {
                    "$gte": batch_start,
                    "$lt": batch_end
                }
            }

            batch_readings = power.find(query_filter, sort=[("created", 1)])
            all_readings.extend(batch_readings)
            print(f"  Batch {batch_start.strftime('%Y-%m-%d')} to {batch_end.strftime('%Y-%m-%d')}: {len(batch_readings)} readings")

        except Exception as e:
            print(f"Error querying batch {batch_start} to {batch_end} for {site}: {e}")
            continue

    return all_readings

def auto_save_previous_month():
    """Automatically save previous month's data if not already saved"""
    try:
        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)

        previous_month = first_day_previous.strftime("%B %Y")

        existing_data = load_monthly_data()

        existing_months = [item.get('month') for item in existing_data]
        if previous_month in existing_months:
            print(f"Data for {previous_month} already exists")
            return

        print(f"Auto-saving data for {previous_month}")

        sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        site_totals = {}

        for site in sites:
            print(f"Processing site: {site}")

            readings = query_power_data_for_month(site, first_day_previous, first_day_current)
            site_total = 0

            for reading in readings:
                energy_wh = reading.get("reading", 0) * (10 / 60)
                site_total += energy_wh

            column_map = {
                "odcdh1": "dh1",
                "odcdh2": "dh2",
                "odcdh3": "dh3",
                "odcdh4": "dh4",
                "odcdh5": "dh5"
            }
            site_totals[column_map[site]] = site_total / 1000
            print(f"  {site} total: {site_total / 1000:.2f} kWh")

        total = sum(site_totals.values())

        new_month_data = {
            "month": previous_month,
            "dh1": site_totals.get("dh1", 0),
            "dh2": site_totals.get("dh2", 0),
            "dh3": site_totals.get("dh3", 0),
            "dh4": site_totals.get("dh4", 0),
            "dh5": site_totals.get("dh5", 0),
            "total": total,
            "openDcFacilityPower": 0,
            "pue": 0,
            "auto_saved": True,
            "saved_date": datetime.now().isoformat()
        }

        existing_data.append(new_month_data)
        save_monthly_data(existing_data)
        print(f"Successfully auto-saved data for {previous_month}")

    except Exception as e:
        print(f"Error in auto-save previous month: {e}")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@monthly_data.route("", methods=["GET"])
def get_monthly_data():
    """Get monthly power data from JSON file"""
    try:
        auto_save_previous_month()
        data = load_monthly_data()
        return data
    except Exception as e:
        return {"status": "error", "data": str(e)}

@monthly_data.route("", methods=["POST"])
def save_monthly_data_endpoint():
    """Save monthly power data to JSON file"""
    try:
        request_data = request.get_json()
        if not request_data or 'data' not in request_data:
            return {"status": "error", "message": "No data provided"}

        data = request_data['data']

        for item in data:
            item['last_updated'] = datetime.now().isoformat()

        success = save_monthly_data(data)

        if success:
            return {"status": "success", "message": "Data saved successfully"}
        else:
            return {"status": "error", "message": "Failed to save data"}

    except Exception as e:
        return {"status": "error", "data": str(e)}

@monthly_data.route("/auto-save", methods=["POST"])
def trigger_auto_save():
    """Manually trigger auto-save for previous month (for testing)"""
    try:
        auto_save_previous_month()
        return {"status": "success", "message": "Auto-save completed"}
    except Exception as e:
        return {"status": "error", "data": str(e)}

@monthly_data.route("/compare", methods=["GET"])
def compare_months():
    try:
        site = request.args.get("site")
        if not site:
            return {"status": "error", "message": "site parameter required"}, 400

        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)

        readings_current = query_power_data_for_month(site, first_day_current, current_date)
        readings_previous = query_power_data_for_month(site, first_day_previous, first_day_current)

        def total_energy(readings):
            total = 0
            for r in readings:
                energy_wh = r.get("reading", 0) * (10 / 60)
                total += energy_wh
            return total / 1000

        site_current_total = total_energy(readings_current)
        site_previous_total = total_energy(readings_previous)

        site_change = site_previous_total > 0 and (
            (site_current_total - site_previous_total) / site_previous_total * 100
        ) or 0

        return {
            "site": site,
            "current": site_current_total,
            "previous": site_previous_total,
            "change": site_change,
        }
    except Exception as e:
        return {"status": "error", "data": str(e)}, 500

# ---------------------------------------------------------------------------
# NEW: Recalculate missing months
# ---------------------------------------------------------------------------

@monthly_data.route("/recalculate-missing", methods=["GET"])
def recalculate_missing():
    """
    Scan for missing months and recalculate their power totals from raw readings.
    Returns a preview without saving.

    Query params:
        months (int): how many months back to scan (default 24)
    """
    try:
        months_back = int(request.args.get("months", 24))
        sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        column_map = {
            "odcdh1": "dh1",
            "odcdh2": "dh2",
            "odcdh3": "dh3",
            "odcdh4": "dh4",
            "odcdh5": "dh5",
        }

        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)

        # Build the full list of completed months we expect
        expected_months = []
        for i in range(1, months_back + 1):
            month_start = first_day_current - relativedelta(months=i)
            expected_months.append(month_start)

        # Load existing data and index by month label
        existing_data = load_monthly_data()
        existing_month_strings = {item.get("month") for item in existing_data}

        # Find which expected months are absent from the store
        missing_months = [
            m for m in expected_months
            if m.strftime("%B %Y") not in existing_month_strings
        ]

        if not missing_months:
            return jsonify({
                "status": "success",
                "missing_count": 0,
                "missing_months": [],
                "existing_count": len(existing_data),
                "message": "No missing months found — history is complete."
            })

        # Recalculate each missing month
        recalculated = []
        for month_start in missing_months:
            month_end = month_start + relativedelta(months=1)
            month_label = month_start.strftime("%B %Y")
            print(f"Recalculating {month_label}...")

            site_totals = {}
            reading_counts = {}
            for site in sites:
                readings = query_power_data_for_month(site, month_start, month_end)
                total_wh = sum(r.get("reading", 0) * (10 / 60) for r in readings)
                col = column_map[site]
                site_totals[col] = round(total_wh / 1000, 2)
                reading_counts[col] = len(readings)
                print(f"  {site}: {len(readings)} readings → {site_totals[col]:.2f} kWh")

            total = round(sum(site_totals.values()), 2)

            recalculated.append({
                "month": month_label,
                "dh1": site_totals.get("dh1", 0),
                "dh2": site_totals.get("dh2", 0),
                "dh3": site_totals.get("dh3", 0),
                "dh4": site_totals.get("dh4", 0),
                "dh5": site_totals.get("dh5", 0),
                "total": total,
                "openDcFacilityPower": 0,
                "pue": 0,
                "auto_saved": True,
                "saved_date": datetime.now().isoformat(),
                "_reading_counts": reading_counts,  # debug info, stripped on save
            })

        return jsonify({
            "status": "success",
            "missing_count": len(recalculated),
            "existing_count": len(existing_data),
            "missing_months": recalculated,
        })

    except Exception as e:
        print(f"Error in recalculate_missing: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@monthly_data.route("/recalculate-missing", methods=["POST"])
def save_recalculated_missing():
    """
    Persist recalculated missing months into the JSON store.
    Body: { "months": [ <MonthlyData>, ... ] }
    Silently skips any month that already exists.
    """
    try:
        body = request.get_json()
        if not body or "months" not in body:
            return jsonify({"status": "error", "message": "No months provided"}), 400

        new_months = body["months"]
        existing_data = load_monthly_data()
        existing_month_strings = {item.get("month") for item in existing_data}

        added = []
        for month_record in new_months:
            month_label = month_record.get("month")
            if month_label in existing_month_strings:
                print(f"Skipping {month_label} — already exists")
                continue

            # Strip debug fields before saving
            month_record.pop("_reading_counts", None)
            month_record["last_updated"] = datetime.now().isoformat()

            existing_data.append(month_record)
            added.append(month_label)

        # Sort chronologically
        def parse_month(item):
            try:
                return datetime.strptime(item.get("month", ""), "%B %Y")
            except Exception:
                return datetime.min

        existing_data.sort(key=parse_month)

        success = save_monthly_data(existing_data)
        if not success:
            return jsonify({"status": "error", "message": "Failed to write data file"}), 500

        return jsonify({
            "status": "success",
            "added_count": len(added),
            "added_months": added,
        })

    except Exception as e:
        print(f"Error saving recalculated months: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
def _completeness_for_site_month(site, m_start, m_end, current_date):
    """
    Return (avg_pct, daily_records) for one site over one calendar month.

    avg_pct       : float 0-100, average of all scored days
    daily_records : list of { date, pct, total_readings, expected_readings }
    Uses 144 readings/location/day (10-min intervals).
    """
    from collections import defaultdict

    readings = query_power_data_for_month(site, m_start, m_end)

    day_location_counts = defaultdict(lambda: defaultdict(int))
    all_locations = set()
    for r in readings:
        ts = r.get("created")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if not isinstance(ts, datetime):
            continue
        loc = r.get("location", "unknown")
        day_location_counts[ts.date().isoformat()][loc] += 1
        all_locations.add(loc)

    # Use month-wide location count so days with zero readings show 0%
    n_locs_baseline = max(len(all_locations), 1)

    day_pcts = []
    daily_records = []
    day = m_start
    while day < m_end:
        if day.date() > current_date.date():
            break
        day_str = day.date().isoformat()
        loc_counts = day_location_counts.get(day_str, {})
        total = sum(loc_counts.values())
        expected = 144 * n_locs_baseline
        pct = min(round((total / expected) * 100, 1), 100.0) if expected > 0 else 0.0
        day_pcts.append(pct)
        daily_records.append({
            "date":              day_str,
            "pct":               pct,
            "total_readings":    total,
            "expected_readings": expected,
        })
        day += timedelta(days=1)

    avg_pct = round(sum(day_pcts) / len(day_pcts), 1) if day_pcts else 0.0
    return avg_pct, daily_records


@monthly_data.route("/data-completeness", methods=["GET"])
def data_completeness():
    """
    Check data completeness for each site, aggregated per calendar month.

    Returns one row per month with completeness % per DH site and an overall average.

    Query params:
        start_date  (str, YYYY-MM)  : first month to include  (default: 12 months ago)
        end_date    (str, YYYY-MM)  : last  month to include  (default: last completed month)
    """
    try:
        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)

        # Parse date range
        raw_start = request.args.get("start_date", "")
        raw_end   = request.args.get("end_date",   "")

        if raw_start:
            try:
                range_start = datetime.strptime(raw_start, "%Y-%m")
            except ValueError:
                return jsonify({"status": "error", "message": "start_date must be YYYY-MM"}), 400
        else:
            range_start = first_day_current - relativedelta(months=12)

        if raw_end:
            try:
                range_end_month = datetime.strptime(raw_end, "%Y-%m")
                # end is inclusive – we want the first day of the NEXT month as the exclusive boundary
                range_end = range_end_month + relativedelta(months=1)
            except ValueError:
                return jsonify({"status": "error", "message": "end_date must be YYYY-MM"}), 400
        else:
            range_end = first_day_current  # last completed month

        # Clamp: never include current (incomplete) month unless explicitly requested
        if range_end > first_day_current:
            range_end = first_day_current + relativedelta(months=1)  # allow current month

        # Build chronological list of (m_start, m_end) month boundaries
        month_ranges = []
        cursor = datetime(range_start.year, range_start.month, 1)
        while cursor < range_end:
            m_end = cursor + relativedelta(months=1)
            month_ranges.append((cursor, m_end))
            cursor = m_end

        sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        col_keys = {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3",
                    "odcdh4": "dh4", "odcdh5": "dh5"}

        # Results: list of { month, dh1, dh2, dh3, dh4, dh5, overall }
        monthly_completeness = []
        for m_start, m_end in month_ranges:
            month_label = m_start.strftime("%B %Y")
            row = {"month": month_label}
            vals = []
            for site in sites:
                print(f"  Completeness: {site} / {month_label}")
                pct, day_records = _completeness_for_site_month(site, m_start, m_end, current_date)
                row[col_keys[site]] = pct
                row.setdefault("daily", {})[col_keys[site]] = day_records
                vals.append(pct)
            row["overall"] = round(sum(vals) / len(vals), 1) if vals else 0.0
            monthly_completeness.append(row)

        return jsonify({
            "status":             "success",
            "monthly_completeness": monthly_completeness,
            "generated_at":       datetime.now().isoformat(),
        })

    except Exception as e:
        print(f"Error in data_completeness: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500


@monthly_data.route("/data-completeness/save", methods=["POST"])
def save_completeness():
    """
    Patch completeness figures into the monthly power JSON store.

    Body: {
      "completeness": {
        "January 2025": { "dh1": 94.5, "dh2": 98.2, "dh3": 87.1,
                          "dh4": 99.0, "dh5": 92.3, "overall": 94.2 },
        ...
      }
    }
    Creates a skeleton record for months not yet in the store (completeness-only).
    """
    try:
        body = request.get_json()
        if not body or "completeness" not in body:
            return jsonify({"status": "error", "message": "No completeness data provided"}), 400

        completeness_map = body["completeness"]   # { "Month YYYY": { dh1, ... overall } }
        existing_data    = load_monthly_data()

        # Index existing records by month label for O(1) lookup
        index = {item.get("month"): i for i, item in enumerate(existing_data)}

        updated = []
        created = []

        for month_label, comp in completeness_map.items():
            if month_label in index:
                existing_data[index[month_label]]["completeness"] = comp
                existing_data[index[month_label]]["last_updated"] = datetime.now().isoformat()
                updated.append(month_label)
            else:
                # Create a minimal record so completeness is not lost
                existing_data.append({
                    "month":               month_label,
                    "dh1": 0, "dh2": 0, "dh3": 0, "dh4": 0, "dh5": 0,
                    "total": 0,
                    "openDcFacilityPower": 0,
                    "pue": 0,
                    "completeness":        comp,
                    "auto_saved":          False,
                    "last_updated":        datetime.now().isoformat(),
                })
                created.append(month_label)

        # Re-sort chronologically
        def parse_month(item):
            try:
                return datetime.strptime(item.get("month", ""), "%B %Y")
            except Exception:
                return datetime.min

        existing_data.sort(key=parse_month)

        if not save_monthly_data(existing_data):
            return jsonify({"status": "error", "message": "Failed to write data file"}), 500

        return jsonify({
            "status":  "success",
            "updated": updated,
            "created": created,
        })

    except Exception as e:
        print(f"Error saving completeness: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500