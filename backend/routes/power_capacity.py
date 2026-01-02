# backend/routes/power_capacity.py
import json
import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from dateutil.relativedelta import relativedelta
from utils.models.power import Power
from collections import defaultdict

power_capacity = Blueprint("power_capacity", __name__)

# Path to store the JSON file
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'power_capacity_data.json')

# Hard-coded planned capacity values (in kW)
PLANNED_CAPACITY = {
    "odcdh1": 429,
    "odcdh2": 693,
    "odcdh3": 396,
    "odcdh4": 165,
    "odcdh5": 209
}

def ensure_data_directory():
    """Ensure the data directory exists"""
    data_dir = os.path.dirname(DATA_FILE_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

def load_capacity_data():
    """Load capacity data from JSON file"""
    try:
        if os.path.exists(DATA_FILE_PATH):
            with open(DATA_FILE_PATH, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading capacity data: {e}")
        return []

def save_capacity_data(data):
    """Save capacity data to JSON file"""
    try:
        ensure_data_directory()
        with open(DATA_FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"Error saving capacity data: {e}")
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

def query_power_in_batches(power_model, query_filter, start_date, end_date, max_days=7):
    """Query power data in batches to avoid large date range errors"""
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
    Calculate live capacity for each data hall for a given month.
    
    Live Capacity Calculation:
    - For each day in the month:
      - For each system in a data hall:
        - Find the highest power reading for that system on that day
      - Sum all system maximums for the data hall for that day
    - The live capacity is the highest daily sum across all days in the month
    
    Returns a dictionary with site keys and their calculated live capacities
    """
    sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
    power_model = Power()
    
    result = {
        "month": start_date.strftime("%B %Y"),
    }
    
    column_map = {
        "odcdh1": "dh1",
        "odcdh2": "dh2",
        "odcdh3": "dh3",
        "odcdh4": "dh4",
        "odcdh5": "dh5"
    }
    
    total_live_capacity = 0
    
    for site in sites:
        try:
            print(f"Processing {site} for live capacity calculation...")
            
            # Get all readings for this site for the month
            readings = query_power_in_batches(
                power_model,
                {"site": site},
                start_date,
                end_date,
                max_days=3
            )
            
            if not readings:
                print(f"No readings found for {site}")
                continue
            
            # Group readings by day and system
            daily_system_readings = defaultdict(lambda: defaultdict(list))
            
            for reading in readings:
                try:
                    timestamp = reading.get("created")
                    if isinstance(timestamp, str):
                        timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    
                    day_key = timestamp.date()
                    system = reading.get("system", reading.get("location", "unknown"))
                    power_value = reading.get("reading", 0)
                    
                    daily_system_readings[day_key][system].append(power_value)
                    
                except Exception as e:
                    print(f"Error processing reading: {e}")
                    continue
            
            # Calculate daily sums (max of each system per day, then sum across systems)
            daily_sums = []
            
            for day, systems_data in daily_system_readings.items():
                day_sum = 0
                for system, power_readings in systems_data.items():
                    max_system_power = max(power_readings)
                    day_sum += max_system_power
                
                daily_sums.append(day_sum)
            
            # The live capacity is the highest daily sum
            if daily_sums:
                live_capacity_w = max(daily_sums)
                live_capacity_kw = live_capacity_w / 1000
                
                col = column_map[site]
                result[f"{col}_live"] = round(live_capacity_kw, 2)
                total_live_capacity += live_capacity_kw
                
                print(f"{site}: Live Capacity = {live_capacity_kw:.2f} kW")
            
        except Exception as e:
            print(f"Error calculating live capacity for {site}: {e}")
            continue
    
    result["total_live"] = round(total_live_capacity, 2)
    
    return result

def calculate_historical_max_capacity():
    """
    Calculate the max capacity (highest live capacity across all historical months)
    for each data hall.
    
    Returns a dictionary with max capacities per site
    """
    # Load all historical data
    historical_data = load_capacity_data()
    
    if not historical_data:
        return {}
    
    sites = ["dh1", "dh2", "dh3", "dh4", "dh5"]
    max_capacities = {}
    
    for site in sites:
        site_max = 0
        
        # Find the highest live capacity across all months for this site
        for month_data in historical_data:
            live_key = f"{site}_live"
            if live_key in month_data:
                live_capacity = month_data[live_key]
                if live_capacity > site_max:
                    site_max = live_capacity
        
        max_capacities[f"{site}_max"] = site_max
    
    # Calculate total max
    total_max = sum(max_capacities.values())
    max_capacities["total_max"] = total_max
    
    return max_capacities

def auto_save_previous_month():
    """Automatically save previous month's capacity data if not already saved"""
    try:
        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)
        
        previous_month = first_day_previous.strftime("%B %Y")
        
        # Load existing data
        existing_data = load_capacity_data()
        
        # Check if previous month data already exists
        existing_months = [item.get('month') for item in existing_data]
        if previous_month in existing_months:
            print(f"Capacity data for {previous_month} already exists")
            return
        
        print(f"Auto-saving capacity data for {previous_month}")
        
        # Calculate live capacity for previous month
        live_capacity_data = calculate_live_capacity_for_month(first_day_previous, first_day_current)
        
        # Get historical max capacities
        historical_max = calculate_historical_max_capacity()
        
        # Build complete data structure
        capacity_data = {
            "month": previous_month,
            "dh1_planned": PLANNED_CAPACITY["odcdh1"],
            "dh1_live": live_capacity_data.get("dh1_live", 0),
            "dh1_max": max(live_capacity_data.get("dh1_live", 0), historical_max.get("dh1_max", 0)),
            "dh2_planned": PLANNED_CAPACITY["odcdh2"],
            "dh2_live": live_capacity_data.get("dh2_live", 0),
            "dh2_max": max(live_capacity_data.get("dh2_live", 0), historical_max.get("dh2_max", 0)),
            "dh3_planned": PLANNED_CAPACITY["odcdh3"],
            "dh3_live": live_capacity_data.get("dh3_live", 0),
            "dh3_max": max(live_capacity_data.get("dh3_live", 0), historical_max.get("dh3_max", 0)),
            "dh4_planned": PLANNED_CAPACITY["odcdh4"],
            "dh4_live": live_capacity_data.get("dh4_live", 0),
            "dh4_max": max(live_capacity_data.get("dh4_live", 0), historical_max.get("dh4_max", 0)),
            "dh5_planned": PLANNED_CAPACITY["odcdh5"],
            "dh5_live": live_capacity_data.get("dh5_live", 0),
            "dh5_max": max(live_capacity_data.get("dh5_live", 0), historical_max.get("dh5_max", 0)),
            "total_planned": sum(PLANNED_CAPACITY.values()),
            "total_live": live_capacity_data.get("total_live", 0),
            "total_max": max(live_capacity_data.get("total_live", 0), historical_max.get("total_max", 0)),
            "auto_saved": True,
            "saved_date": datetime.now().isoformat()
        }
        
        # Calculate available capacities (planned - max)
        for site in ["dh1", "dh2", "dh3", "dh4", "dh5"]:
            planned = capacity_data[f"{site}_planned"]
            max_cap = capacity_data[f"{site}_max"]
            capacity_data[f"{site}_available"] = round(planned - max_cap, 2)
        
        capacity_data["total_available"] = round(
            capacity_data["total_planned"] - capacity_data["total_max"], 2
        )
        
        # Add to existing data and save
        existing_data.append(capacity_data)
        save_capacity_data(existing_data)
        print(f"Successfully auto-saved capacity data for {previous_month}")
        
    except Exception as e:
        print(f"Error in auto-save previous month capacity: {e}")

@power_capacity.route("", methods=["GET"])
def get_capacity_data():
    """Get power capacity data from JSON file"""
    try:
        # Auto-save previous month if needed
        auto_save_previous_month()
        
        data = load_capacity_data()
        return jsonify(data)
    except Exception as e:
        return {"status": "error", "data": str(e)}

@power_capacity.route("/current-previous", methods=["GET"])
def get_current_previous():
    """Get current and previous month capacity data"""
    try:
        # Auto-save previous month if needed
        auto_save_previous_month()
        
        current_date = datetime.now()
        first_day_current = datetime(current_date.year, current_date.month, 1)
        first_day_previous = first_day_current - relativedelta(months=1)
        
        current_month = current_date.strftime("%B %Y")
        previous_month = first_day_previous.strftime("%B %Y")
        
        # Load existing data
        existing_data = load_capacity_data()
        
        # Calculate current month live capacity
        current_live_data = calculate_live_capacity_for_month(first_day_current, current_date)
        
        # Get historical max capacities
        historical_max = calculate_historical_max_capacity()
        
        # Build current month data structure
        current_data = {
            "month": current_month,
            "dh1_planned": PLANNED_CAPACITY["odcdh1"],
            "dh1_live": current_live_data.get("dh1_live", 0),
            "dh1_max": max(current_live_data.get("dh1_live", 0), historical_max.get("dh1_max", 0)),
            "dh2_planned": PLANNED_CAPACITY["odcdh2"],
            "dh2_live": current_live_data.get("dh2_live", 0),
            "dh2_max": max(current_live_data.get("dh2_live", 0), historical_max.get("dh2_max", 0)),
            "dh3_planned": PLANNED_CAPACITY["odcdh3"],
            "dh3_live": current_live_data.get("dh3_live", 0),
            "dh3_max": max(current_live_data.get("dh3_live", 0), historical_max.get("dh3_max", 0)),
            "dh4_planned": PLANNED_CAPACITY["odcdh4"],
            "dh4_live": current_live_data.get("dh4_live", 0),
            "dh4_max": max(current_live_data.get("dh4_live", 0), historical_max.get("dh4_max", 0)),
            "dh5_planned": PLANNED_CAPACITY["odcdh5"],
            "dh5_live": current_live_data.get("dh5_live", 0),
            "dh5_max": max(current_live_data.get("dh5_live", 0), historical_max.get("dh5_max", 0)),
            "total_planned": sum(PLANNED_CAPACITY.values()),
            "total_live": current_live_data.get("total_live", 0),
            "total_max": max(current_live_data.get("total_live", 0), historical_max.get("total_max", 0)),
        }
        
        # Calculate available capacities (planned - max)
        for site in ["dh1", "dh2", "dh3", "dh4", "dh5"]:
            planned = current_data[f"{site}_planned"]
            max_cap = current_data[f"{site}_max"]
            current_data[f"{site}_available"] = round(planned - max_cap, 2)
        
        current_data["total_available"] = round(
            current_data["total_planned"] - current_data["total_max"], 2
        )
        
        # Get previous month data from saved data
        previous_data = next((item for item in existing_data if item['month'] == previous_month), None)
        
        return jsonify({
            "current": current_data,
            "previous": previous_data
        })
        
    except Exception as e:
        print(f"Error getting current/previous capacity: {e}")
        return {"status": "error", "message": str(e)}, 500

@power_capacity.route("/auto-save", methods=["POST"])
def trigger_auto_save():
    """Manually trigger auto-save for previous month (for testing)"""
    try:
        auto_save_previous_month()
        return {"status": "success", "message": "Auto-save completed"}
    except Exception as e:
        return {"status": "error", "data": str(e)}