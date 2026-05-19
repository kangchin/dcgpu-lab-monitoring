class ConductorReservationModel(object):
    """
    Structural contract for a Conductor Reservation.
    Reservations are time-bound access grants.
    """

    object_type = "conductor_reservation"

    identity = {
        "id": "string",
        "date_create": "datetime",
        "date_start": "datetime",
        "date_end": "datetime",
    }

    ownership = {
        "user_email": "string",
        "team_id": "string | null",
    }

    scope = {
        "systems": ["string (system_id)"],
        "entities": ["string (entity_id)"],
        "pool_id": "string",
    }

    state = {
        "active": "bool",
        "cancelled": "bool",
        "ended": "bool",
    }

    constraints = {
        "exclusive": "bool",
        "force": "bool",
    }

    ai_rules = [
        "Reservations reference systems by ID only",
        "Reservations do not embed system data",
        "A reservation may apply to many systems",
        "Time boundaries are authoritative",
        "Never assume active == usable (check pool rules)",
    ]