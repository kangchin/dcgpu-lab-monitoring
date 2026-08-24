from flask import Blueprint, current_app, jsonify, request
import re
import requests

from utils.factory.conductor import ConductorClient, ConductorClientError

conductor_system = Blueprint("conductor_system", __name__)

# Pattern 1 (odc): {model}-odc{dh}-{rack}-{level}   e.g. gbt350-odcdh1-a01-1
_ODC_RE = re.compile(r'^(.+?)-(odc)(dh\d+)-([a-z0-9]+)(?:-([a-z0-9]+))?$', re.IGNORECASE)

# Pattern 2 (gbs): {model}-gbs{lab}-wb{num}{level}   e.g. asrock-gbs6a-wb01b
_GBS_RE = re.compile(r'^(.+?)-(gbs)(\d+[a-z]?)-(wb\d+)([a-z])?$', re.IGNORECASE)


def _parse_system_name(name: str) -> dict | None:
    m = _ODC_RE.match(name)
    if m:
        return {
            "name": name,
            "model": m.group(1),
            "site": m.group(2).lower(),
            "data_hall": m.group(3).lower(),
            "rack": m.group(4).lower(),
            "level": m.group(5).lower() if m.group(5) else None,
        }
    m = _GBS_RE.match(name)
    if m:
        return {
            "name": name,
            "model": m.group(1),
            "site": m.group(2).lower(),
            "data_hall": m.group(3).lower(),
            "rack": m.group(4).lower(),
            "level": m.group(5).lower() if m.group(5) else None,
        }
    return None


def _make_client(timeout_seconds=5):
    return ConductorClient(
        base_url=current_app.config["CONDUCTOR_BASE_URL"],
        api_endpoint=current_app.config["CONDUCTOR_API_ENDPOINT"],
        api_token=current_app.config["CONDUCTOR_API_TOKEN"],
        email=current_app.config["CONDUCTOR_EMAIL"],
        auth_format=current_app.config["CONDUCTOR_AUTH_FORMAT"],
        auth_scheme=current_app.config["CONDUCTOR_AUTH_SCHEME"],
        token_header=current_app.config["CONDUCTOR_TOKEN_HEADER"],
        system_query_param=current_app.config["CONDUCTOR_SYSTEM_QUERY_PARAM"],
        verify_ssl=False,
        ca_bundle_path=current_app.config["CONDUCTOR_CA_BUNDLE_PATH"],
        timeout_seconds=timeout_seconds,
        ping_timeout_seconds=current_app.config["PING_TIMEOUT_SECONDS"],
        ssh_key_path=current_app.config["SSH_KEY_PATH"],
        ssh_username=current_app.config["SSH_USERNAME"],
        ssh_timeout_seconds=current_app.config["SSH_TIMEOUT_SECONDS"],
        ssh_default_username=current_app.config["SSH_DEFAULT_USERNAME"],
        ssh_default_password=current_app.config["SSH_DEFAULT_PASSWORD"],
    )


@conductor_system.route("/list", methods=["GET"])
def list_systems_by_locale():
    """
    List all system names from Conductor filtered by locale name.
    ---
    tags:
      - Conductor System
    parameters:
      - name: locale
        in: query
        type: string
        required: true
        description: Locale name to filter by (e.g. "Penang")
    responses:
      200:
        description: List of system names in the given locale
        schema:
          type: object
          properties:
            locale:
              type: string
            count:
              type: integer
            systems:
              type: array
              items:
                type: string
      400:
        description: Missing locale parameter
      504:
        description: Conductor API timed out
      502:
        description: Conductor client error
    """
    locale_name = request.args.get("locale", "").strip()
    if not locale_name:
        return jsonify({"error": "locale query parameter is required."}), 400

    try:
        client = _make_client(timeout_seconds=15)
        systems = client.fetch_systems_by_locale(locale_name)
        return jsonify({"locale": locale_name, "count": len(systems), "systems": systems}), 200
    except requests.Timeout:
        return jsonify({"error": "Conductor API request timed out."}), 504
    except ConductorClientError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@conductor_system.route("/", methods=["GET"])
def list_systems_by_filter():
    """
    List systems filtered by site, data hall, rack and/or level.
    ---
    tags:
      - Conductor System
    parameters:
      - name: locale
        in: query
        type: string
        description: Locale to fetch from (default "Penang")
      - name: site
        in: query
        type: string
        description: Site code, e.g. "odc"
      - name: data_hall
        in: query
        type: string
        description: Data hall, e.g. "dh1"
      - name: rack
        in: query
        type: string
        description: Rack ID, e.g. "a01"
      - name: level
        in: query
        type: string
        description: Level, e.g. "1"
    responses:
      200:
        description: Filtered list of systems with parsed metadata
      502:
        description: Conductor client error
      504:
        description: Conductor API timed out
    """
    locale_name = request.args.get("locale", "Penang").strip()
    site_filter    = request.args.get("site", "").strip().lower()
    dh_filter      = request.args.get("data_hall", "").strip().lower()
    rack_filter    = request.args.get("rack", "").strip().lower()
    level_filter   = request.args.get("level", "").strip().lower()

    try:
        client = _make_client(timeout_seconds=15)
        all_names = client.fetch_systems_by_locale(locale_name)
    except requests.Timeout:
        return jsonify({"error": "Conductor API request timed out."}), 504
    except ConductorClientError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    results = []
    for name in all_names:
        parsed = _parse_system_name(name)
        if not parsed:
            continue
        if site_filter  and parsed["site"]      != site_filter:
            continue
        if dh_filter    and parsed["data_hall"] != dh_filter:
            continue
        if rack_filter  and parsed["rack"]      != rack_filter:
            continue
        if level_filter and parsed["level"]     != level_filter:
            continue
        results.append(parsed)

    return jsonify({"locale": locale_name, "count": len(results), "systems": results}), 200


@conductor_system.route("/raw-data", methods=["GET"])
def get_system_data():
    system_name = request.args.get("system_name", "").strip()

    if not system_name:
        return jsonify({"error": "system_name query parameter is required."}), 400

    try:
        client = _make_client(timeout_seconds=5)
        data = client.fetch_system_health(system_name)
        if not isinstance(data, dict) or not data.get("details"):
            headers = client._build_headers()
            complete_data = client._query_system_controller(system_name, headers)
            if complete_data:
                data = complete_data
        return jsonify(data), 200
    except requests.Timeout:
        return jsonify({"error": "Conductor API request timed out. The service may be unreachable or slow to respond."}), 504
    except ConductorClientError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
