import json
from datetime import datetime, timedelta
from flask import Blueprint, request
from utils.models.power import Power
from dateutil.relativedelta import relativedelta

power = Blueprint("power", __name__)

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

@power.route("", methods=["GET"])
def get_power():
    try:
        site = request.args.get("site")
        location = request.args.get("location")
        timeline = request.args.get("timeline")
        aggregate = request.args.get("aggregate")

        query_filter = {}
        if site:
            query_filter["site"] = site
        if location:
            query_filter["location"] = { "$regex": location }
        
        power_model = Power()
        
        if timeline:
            current_time = datetime.now()
            
            if timeline == "24h":
                start_time = current_time - relativedelta(hours=24)
                query_filter["created"] = {"$gte": start_time}
                results = power_model.find(query_filter, sort=[("created", 1)])
                
            elif timeline == "7d":
                start_time = current_time - relativedelta(days=7)
                query_filter["created"] = {"$gte": start_time}
                results = power_model.find(query_filter, sort=[("created", 1)])
                
            elif timeline == "1mnth":
                start_time = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                
                if aggregate == "true" or request.headers.get('X-Request-Type') == 'chart':
                    return get_aggregated_power_data(power_model, query_filter, start_time, current_time, site)
                else:
                    results = query_power_in_batches(power_model, query_filter, start_time, current_time)
                
            else:
                start_time = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                results = query_power_in_batches(power_model, query_filter, start_time, current_time)
        else:
            results = power_model.find(query_filter, sort=[("created", 1)])
            
        return results
        
    except Exception as e:
        return {"status": "error", "data": str(e)}


def get_aggregated_power_data(power_model, query_filter, start_time, end_time, site):
    """Return aggregated hourly power data for charts"""
    try:
        all_readings = query_power_in_batches(power_model, query_filter, start_time, end_time, max_days=2)
        
        hourly_data = {}
        
        for reading in all_readings:
            timestamp = reading.get('created')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
            location = reading.get('location', 'unknown')
            power_value = reading.get('reading', 0)
            
            key = f"{hour_key}|{location}"
            
            if key not in hourly_data:
                hourly_data[key] = {
                    'created': hour_key.isoformat(),
                    'location': location,
                    'site': site,
                    'readings': [],
                    'count': 0
                }
            
            hourly_data[key]['readings'].append(power_value)
            hourly_data[key]['count'] += 1
        
        aggregated_results = []
        for data in hourly_data.values():
            if data['readings']:
                avg_reading = sum(data['readings']) / len(data['readings'])
                aggregated_results.append({
                    'created': data['created'],
                    'location': data['location'], 
                    'site': data['site'],
                    'reading': round(avg_reading, 2),
                    'sample_count': data['count']
                })
        
        aggregated_results.sort(key=lambda x: x['created'])
        return aggregated_results
        
    except Exception as e:
        print(f"Error in aggregated power data: {e}")
        return {"status": "error", "data": str(e)}

@power.route("latest", methods=["GET"])
def get_latest():
    try:
        site = request.args.get("site")
        location = request.args.get("location")
        power_model = Power()
        collection = power_model.db.db[power_model.collection_name]

        match_stage = {"site": site} if site else {}
        if location:
            match_stage["location"] = {"$regex": location}
        pipeline = [
            {"$match": match_stage},
            {"$sort": {"location": 1, "created": -1}},
            {"$group": {"_id": "$location", "latest": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$latest"}}
        ]
        results = list(collection.aggregate(pipeline))
        for doc in results:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return results
    except Exception as e:
        return {"status": "error", "data": str(e)}


@power.route("monthly-summary", methods=["GET"])
def get_monthly_summary():
    """
    O(1) monthly power summary via Redis running totals.

    Current month energy is read from a Redis hash maintained incrementally
    by the Celery worker (hincrbyfloat on every collection run).
    Previous month energy is read from the local JSON file written at
    month-end by auto_save_previous_month().

    Falls back to a full DB scan only on cold-start (Redis empty) and
    populates Redis so every subsequent call is O(1).
    """
    try:
        from utils.factory.redis_client import redis as r_client
        import os as _os

        sites_param = request.args.get("sites", "")
        sites = [s.strip() for s in sites_param.split(",") if s.strip()] if sites_param else []
        if not sites:
            sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]

        current_date        = datetime.now()
        current_month_start = datetime(current_date.year, current_date.month, 1)

        if current_date.month == 1:
            prev_month_start = datetime(current_date.year - 1, 12, 1)
        else:
            prev_month_start = datetime(current_date.year, current_date.month - 1, 1)

        month_str           = current_month_start.strftime("%Y-%m")
        current_month_label = current_month_start.strftime("%B %Y")
        prev_month_label    = prev_month_start.strftime("%B %Y")

        # ── Helper: decode bytes returned when decode_responses=False ─────────
        def _f(v):
            if v is None:
                return None
            return float(v.decode("utf-8") if isinstance(v, bytes) else v)

        # ── Step 1: current month energy from Redis (O(1)) ───────────────────
        energy_key = f"monthly_energy:{month_str}"
        raw        = r_client.hgetall(energy_key)          # {b'odcdh1': b'12345.6', ...}

        current_wh: dict = {}
        for k, v in (raw or {}).items():
            key = k.decode("utf-8") if isinstance(k, bytes) else k
            current_wh[key] = float(v.decode("utf-8") if isinstance(v, bytes) else v)

        # ── Step 2: previous month energy from JSON file (O(1)) ──────────────
        data_path = _os.path.join(
            _os.path.dirname(__file__), "..", "data", "monthly_power_data.json"
        )
        col_map = {
            "odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3",
            "odcdh4": "dh4", "odcdh5": "dh5",
        }
        prev_kwh: dict = {}
        if _os.path.exists(data_path):
            try:
                with open(data_path) as fh:
                    history = json.load(fh)
                for record in history:
                    if record.get("month") == prev_month_label:
                        for site in sites:
                            col = col_map.get(site, "")
                            if col:
                                prev_kwh[site] = float(record.get(col, 0))  # already kWh
                        break
            except Exception as e:
                print(f"Error reading monthly_power_data.json: {e}")

        # ── Step 3: cold-start fallback – populate Redis from DB ─────────────
        missing = [s for s in sites if s not in current_wh]
        if missing:
            print(f"Monthly energy Redis miss for {missing} – one-time DB scan, will cache result")
            power_model = Power()
            for site in missing:
                try:
                    readings = query_power_in_batches(
                        power_model, {"site": site},
                        current_month_start, current_date, max_days=3
                    )
                    wh = sum(item.get("reading", 0) * (10.0 / 60.0) for item in readings)
                    current_wh[site] = wh
                    # Seed Redis so the next call is O(1)
                    if wh >= 0:
                        r_client.hset(energy_key, site, wh)
                        r_client.expire(energy_key, 90 * 24 * 3600)
                except Exception as e:
                    print(f"DB fallback error for {site}: {e}")
                    current_wh[site] = 0.0

        # ── Step 4: build response ────────────────────────────────────────────
        results = {}
        for site in sites:
            current_kwh = round(current_wh.get(site, 0) / 1000.0, 2)
            previous_kwh = round(prev_kwh.get(site, 0), 2)
            change = ((current_kwh - previous_kwh) / previous_kwh * 100) if previous_kwh > 0 else 0.0
            results[site] = {
                "current_month_kwh":  current_kwh,
                "previous_month_kwh": previous_kwh,
                "percentage_change":  round(change, 1),
            }

        total_current  = sum(v["current_month_kwh"]  for v in results.values())
        total_previous = sum(v["previous_month_kwh"] for v in results.values())
        total_change   = ((total_current - total_previous) / total_previous * 100) if total_previous > 0 else 0.0

        return {
            "sites": results,
            "totals": {
                "current_month_kwh":  round(total_current, 2),
                "previous_month_kwh": round(total_previous, 2),
                "percentage_change":  round(total_change, 1),
            },
            "month_info": {
                "current_month": current_month_label,
                "previous_month": prev_month_label,
            },
        }

    except Exception as e:
        return {"status": "error", "data": str(e)}


@power.route("historical-summary", methods=["GET"])
def get_historical_summary():
    """Get historical monthly summaries for the past 12 months"""
    try:
        months_back = int(request.args.get("months", 12))
        sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        
        current_date = datetime.now()
        results = []
        power_model = Power()
        
        for i in range(months_back):
            if current_date.month - i <= 0:
                year = current_date.year - 1
                month = 12 + (current_date.month - i)
            else:
                year = current_date.year
                month = current_date.month - i
            
            month_start = datetime(year, month, 1)
            
            if month == 12:
                month_end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
            else:
                month_end = datetime(year, month + 1, 1) - timedelta(seconds=1)
            
            month_name = month_start.strftime("%B %Y")
            
            if i == 0:
                month_end = min(month_end, current_date)
            
            month_data = {
                "month": month_name,
                "dh1": 0, "dh2": 0, "dh3": 0, "dh4": 0, "dh5": 0,
                "total": 0, "openDcFacilityPower": 0, "pue": 0,
            }
            
            for site in sites:
                try:
                    readings = query_power_in_batches(
                        power_model, {"site": site}, month_start, month_end, max_days=2
                    )
                    energy_kwh = sum((r.get("reading", 0) * (10 / 60)) for r in readings) / 1000
                    column_map = {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3", "odcdh4": "dh4", "odcdh5": "dh5"}
                    if site in column_map:
                        month_data[column_map[site]] = round(energy_kwh, 2)
                except Exception as e:
                    print(f"Error processing {site} for {month_name}: {e}")
                    continue
            
            month_data["total"] = round(
                month_data["dh1"] + month_data["dh2"] + month_data["dh3"] +
                month_data["dh4"] + month_data["dh5"], 2
            )
            results.append(month_data)
        
        results.reverse()
        
        return {
            "months": results,
            "generated_at": datetime.now().isoformat(),
            "note": "Pre-calculated historical summaries"
        }
        
    except Exception as e:
        return {"status": "error", "data": str(e)}


@power.route("current-month-summary", methods=["GET"])
def get_current_month_summary():
    """Get current month summary with live data"""
    try:
        sites = ["odcdh1", "odcdh2", "odcdh3", "odcdh4", "odcdh5"]
        
        current_date = datetime.now()
        month_start = datetime(current_date.year, current_date.month, 1)
        
        power_model = Power()
        current_month_data = {
            "month": month_start.strftime("%B %Y"),
            "dh1": 0, "dh2": 0, "dh3": 0, "dh4": 0, "dh5": 0,
            "total": 0, "openDcFacilityPower": 0, "pue": 0,
        }
        
        for site in sites:
            try:
                readings = query_power_in_batches(
                    power_model, {"site": site}, month_start, current_date, max_days=2
                )
                energy_kwh = sum((r.get("reading", 0) * (10 / 60)) for r in readings) / 1000
                column_map = {"odcdh1": "dh1", "odcdh2": "dh2", "odcdh3": "dh3", "odcdh4": "dh4", "odcdh5": "dh5"}
                if site in column_map:
                    current_month_data[column_map[site]] = round(energy_kwh, 2)
            except Exception as e:
                print(f"Error processing {site}: {e}")
                continue
        
        current_month_data["total"] = round(
            current_month_data["dh1"] + current_month_data["dh2"] +
            current_month_data["dh3"] + current_month_data["dh4"] +
            current_month_data["dh5"], 2
        )
        
        return {
            "current_month": current_month_data,
            "generated_at": datetime.now().isoformat(),
            "is_live": True
        }
        
    except Exception as e:
        return {"status": "error", "data": str(e)}