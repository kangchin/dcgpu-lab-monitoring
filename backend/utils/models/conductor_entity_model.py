class ConductorEntityModel(object):
    """
    Structural contract for Conductor Entities
    (racks, system groups, VM groups, etc.).
    """

    object_type = "conductor_entity"

    identity = {
        "id": "string",
        "name": "string",
        "entity_type": (
            "standalone_system | system_group | rack | "
            "mini-rack | rack_manager | switch"
        ),
    }

    policy = {
        "allow_batch": "bool",
        "allow_reservations": "bool",
        "disabled": "bool",
    }

    relationships = {
        "nodes": ["entity_id | system_id"],
        "parent_entity_id": "string | null",
        "pool_id": "string | null",
    }

    ai_rules = [
        "Entities form a tree",
        "Policies propagate downward",
        "Systems may exist outside entities",
    ]