from flask import Blueprint, request
from utils.models.systems import Systems

systems = Blueprint("systems", __name__)


@systems.route("", methods=["GET"])
def get_systems():
    try:
        site = request.args.get("site")
        location = request.args.get("location")

        query_filter = {}
        if site:
            query_filter["site"] = site
        if location:
            query_filter["location"] = location

        systems_model = Systems()
        results = systems_model.find(query_filter)
        return results
    except Exception as e:
        return {"status": "error", "data": str(e)} 