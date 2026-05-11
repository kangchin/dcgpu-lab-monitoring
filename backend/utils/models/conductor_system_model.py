class ConductorSystemModel(object):
    """
    Structural contract for a Conductor System object.

    PURPOSE:
    - Describe ALL system-related data and where it lives
    - Enable safe programmatic traversal by humans or AIs
    - Prevent field-name guessing or invalid assumptions

    IMPORTANT:
    - Not all systems have all fields
    - Many fields may be None
    - Arrays may be empty
    """

    object_type = "conductor_system"

    # ==================================================================
    # IDENTIFIERS (always present)
    # ==================================================================
    identity = {
        "id": "string (UUID)",
        "archived": "bool",
        "date_create": "datetime",
    }

    # ==================================================================
    # CORE SYSTEM DATA (primary identity & config)
    # ==================================================================
    system_datas = {
        "name": "string",
        "hostname_ip": "string",
        "platform_id": "string",
        "username": "string | null",
        "password": "string | null",
        "godzilla_asset_id": "string | null",
        "platform_config": {
            "notes": "string | null",
            "num_sockets": "int | null",
            "num_dcgpus": "int | null",

            # ---------------- POWER CONTROLLERS (BMC / IPMI / Redfish) ----
            "power_controllers": [
                {
                    "ip": "string | null",
                    "port": "int | string | null",
                    "type": "string (ipmi | bmc | redfish | other)",
                    "user": "string | null",
                    "password": "string | null",
                }
            ],

            # ---------------- PDU / POWER DISTRIBUTION -------------------
            "power_distribution": [
                {
                    "hostname_ip_url": "string",
                    "outlet": "int | string",
                    "user": "string",
                    "password": "string",
                }
            ],

            # ---------------- EXTERNAL JTAG ------------------------------
            "external_jtag": [
                {
                    "ip": "string | null",
                    "port": "int | string | null",
                    "type": "string",
                    "user": "string | null",
                    "password": "string | null",
                }
            ],
        },
    }

    # ==================================================================
    # PLATFORM METADATA
    # ==================================================================
    platform = {
        "id": "string",
        "name": "string",
        "short_name": "string",
        "platform_schema": "dict",
    }

    # ==================================================================
    # POOL MEMBERSHIP
    # ==================================================================
    pool = {
        "id": "string",
        "name": "string",
        "exclusive": "bool",
        "archived": "bool",
    }

    # ==================================================================
    # LABELS
    # ==================================================================
    system_labels = [
        {
            "id": "string",
            "name": "string",
            "description": "string | null",
        }
    ]

    # ==================================================================
    # STATE & AVAILABILITY
    # ==================================================================
    system_states = {
        "disabled": "bool",
        "disabled_by": "string | null",
        "disabled_reason": "string | null",
        "disable_return_online_time": "datetime | null",
        "ssh_enabled": "bool",
        "ssh_optout_reason": "string | null",
        "ssh_optout_reason_by": "string | null",
    }

    reservation = {
        "reservation_only": "bool",
        "system_pool_association_id": "string | null",
    }

    # ==================================================================
    # MAAS DATA (provisioning / PXE)
    # ==================================================================
    system_maas_data = {
        "ready": "bool",
        "status": "string | null",
        "status_message": "string | null",
        "os": "string | null",
        "machine_id": "string | null",
        "fqdn": "string | null",
        "ip_addresses": ["string"],
        "mac_addresses": ["string"],
        "power_type": "string | null",
    }

    # ==================================================================
    # SSH SCRAPED DATA (runtime introspection)
    # ==================================================================
    system_ssh_data = {
        "ip": "string | null",
        "os": "string | null",
        "kernel": "string | null",
        "bios": "string | null",
        "cpu_socket_count": "int",
        "cpu_opn": "string | null",
        "gpu_count": "int",
        "gpu_device_map": "dict | null",
        "gpu_vf_count": "int",
        "mem_total": "string | null",
        "mem_free": "string | null",
        "df": ["string"],
        "nproc": "int",
        "network_adapters": "dict | null",
        "mac_addresses": ["string"],
        "rocm_ver": "string | null",
    }

    # ==================================================================
    # DEVICE DATA (including power at runtime)
    # ==================================================================
    system_device_data = {
        "device_data": "dict | list | null",
        "firmware": "dict | null",

        # power data discovered at runtime
        "power_controllers": {
            "keyed_by": "string",
            "value_schema": {
                "ip": "string | null",
                "type": "string",
            }
        },

        "power_distribution": {
            "keyed_by": "string",
            "value_schema": {
                "hostname_ip_url": "string",
                "outlet": "int | string",
            }
        },
    }

    # ==================================================================
    # NETWORK TOPOLOGY
    # ==================================================================
    rack_manager = {
        "id": "string | null",
        "hostname_ip": "string | null",
        "port": "int | null",
        "username": "string | null",
    }

    switches = [
        {
            "id": "string",
            "name": "string",
            "ip_address": "string",
        }
    ]

    # ==================================================================
    # AI RULES (CRITICAL FOR SAFE USE)
    # ==================================================================
    ai_rules = [
        "Do not assume any subsection exists",
        "Fields marked '| null' may be missing",
        "Lists may be empty",
        "power_controllers != power_distribution",
        "platform_config is static intent, device_data is runtime state",
        "Prefer system_device_data for live values",
        "Prefer system_datas.platform_config for credentials",
        "Never assume credentials are present",
    ]