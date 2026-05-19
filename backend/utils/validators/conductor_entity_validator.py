class ConductorEntityValidator:
    """
    Semantic validator for Conductor Entities.

    Enforces hierarchy, policy, and safety invariants
    that JSON Schema alone cannot express.
    """

    NON_LEAF_ENTITY_TYPES = {
        "rack",
        "mini-rack",
        "system_group",
        "vm_group",
    }

    LEAF_ENTITY_TYPES = {
        "standalone_system",
        "switch",
        "rack_manager",
    }

    def validate(self, entity):
        self._validate_hierarchy(entity)
        self._validate_policy(entity)
        self._validate_disable_state(entity)

    def _validate_hierarchy(self, entity):
        etype = entity["entity_type"]
        nodes = entity.get("nodes", [])

        if etype in self.LEAF_ENTITY_TYPES and nodes:
            raise ValueError(
                f"Entity type '{etype}' must not have child nodes"
            )

        if etype in self.NON_LEAF_ENTITY_TYPES and not nodes:
            # Allowed, but important signal for AI
            entity.setdefault("_warnings", []).append(
                "Group entity has no children"
            )

    def _validate_policy(self, entity):
        if not entity.get("allow_reservations", True) \
           and entity.get("allow_batch", True):
            raise ValueError(
                "Entity cannot allow batch while disallowing reservations"
            )

    def _validate_disable_state(self, entity):
        if entity.get("disabled") and not entity.get("disabled_reason"):
            raise ValueError(
                "Disabled entity must include disabled_reason"
            )