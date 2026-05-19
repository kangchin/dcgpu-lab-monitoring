class ConductorPoolValidator:
    """
    Enforces pool policy logic.
    """

    def validate(self, pool):
        if pool.get("exclusive") and pool.get("free_for_all"):
            raise ValueError(
                "Pool cannot be both exclusive and free_for_all"
            )