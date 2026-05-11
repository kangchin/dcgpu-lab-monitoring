class ConductorSystemValidator:
    """
    Semantic validator for Conductor System objects.
    Enforces domain rules JSON Schema cannot.
    """

    def validate(self, system):
        self._validate_identity(system)
        self._validate_power_consistency(system)

    def _validate_identity(self, system):
        if not system.get("id"):
            raise ValueError("System missing 'id'")

        if not system.get("system_datas", {}).get("name"):
            raise ValueError("System missing system_datas.name")

    def _validate_power_consistency(self, system):
        cfg = system["system_datas"].get("platform_config")
        dev = system.get("system_device_data")

        has_cfg_power = bool(cfg and cfg.get("power_controllers"))
        has_dev_power = bool(dev and dev.get("power_controllers"))

        if not (has_cfg_power or has_dev_power):
            # Legal but important signal
            system["_warnings"] = ["No power control configured"]