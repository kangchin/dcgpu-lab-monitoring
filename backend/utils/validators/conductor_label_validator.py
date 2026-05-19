class ConductorLabelValidator:
    def validate(self, label):
        if " " in label["name"]:
            raise ValueError(
                "Label name must not contain spaces"
            )