class ConductorLabelModel(object):
    """
    Structural contract for Conductor System Labels.
    Labels are lightweight, many-to-many tags.
    """

    object_type = "conductor_system_label"

    identity = {
        "id": "string",
        "name": "string",
        "date_create": "datetime",
    }

    properties = {
        "description": "string | null",
    }

    relationships = {
        "applies_to": "systems (many-to-many)",
    }

    ai_rules = [
        "Labels are not hierarchical",
        "Labels carry no policy by themselves",
        "Labels may be used as filters or signals only",
        "A system may have zero labels",
    ]