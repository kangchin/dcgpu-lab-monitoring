class ConductorPoolModel(object):
    """
    Structural contract for a Conductor Pool object.
    Pools control access, reservation behavior, and isolation.
    """

    object_type = "conductor_pool"

    identity = {
        "id": "string",
        "name": "string",
        "archived": "bool",
        "date_create": "datetime",
    }

    access_properties = {
        "exclusive": "bool",
        "free_for_all": "bool",
        "batch_free_for_all": "bool",
        "unrestricted_access": "bool",
        "block_api_access": "bool",
    }

    reservation_policy = {
        "reservation_strategy": "string (calendar | interactive)",
        "reservation_duration_limit": "int | null",
        "furthest_future_reservation": "int | null",
    }

    automation_flags = {
        "allow_idle_sweep": "bool",
        "allow_floor_sweeper": "bool",
        "allow_system_monitor": "bool",
    }

    metadata = {
        "details": "dict | string | null",
        "debug_reservations": "bool",
        "low_touch_pool": "bool | null",
    }

    ai_rules = [
        "Pools do not contain systems directly; systems reference pools",
        "Pool policy affects reservations but not system hardware",
        "Archived pools may still be referenced by systems",
        "Never assume exclusive == single-user",
    ]