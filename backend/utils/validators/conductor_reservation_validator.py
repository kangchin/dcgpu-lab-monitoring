from datetime import datetime

class ConductorReservationValidator:
    """
    Enforces reservation temporal and semantic correctness.
    """

    def validate(self, reservation):
        start = datetime.fromisoformat(
            reservation["date_start"]
        )
        end = datetime.fromisoformat(
            reservation["date_end"]
        )

        if end <= start:
            raise ValueError(
                "Reservation end time must be after start time"
            )

        if not reservation.get("systems"):
            raise ValueError(
                "Reservation must reference at least one system"
            )