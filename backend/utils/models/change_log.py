from utils.factory.validation import Validator
from utils.factory.database import Database


class ChangeLog(object):
    def __init__(self):
        self.validator = Validator()
        self.db = Database()

        self.collection_name = "change_logs"  # collection name

        self.fields = {
            "entity_type": "string",  # "system" or "pdu"
            "entity_id": "string",  # MongoDB ObjectId of the entity
            "entity_name": "string",  # System name or PDU hostname
            "change_type": "string",  # "ip_update", "create", etc.
            "old_values": "object",  # Dictionary of old values
            "new_values": "object",  # Dictionary of new values
            "changed_by": "string",  # Admin username/identifier
            "reason": "string",  # Optional reason for change
            "created": "datetime",
        }

        self.create_required_fields = [
            "entity_type",
            "entity_name",
            "change_type",
            "new_values",
            "changed_by",
        ]

        self.create_optional_fields = [
            "entity_id",
            "old_values",
            "reason",
            "created",
        ]

        self.update_required_fields = []
        self.update_optional_fields = []

    def create(self, data):
        self.validator.validate(
            data,
            self.fields,
            self.create_required_fields,
            self.create_optional_fields,
        )
        res = self.db.insert(data, self.collection_name)
        return "Inserted Id " + res

    def find(self, data, sort=None, limit=0):
        return self.db.find(data, self.collection_name, sort=sort, limit=limit)

    def find_by_id(self, id):
        return self.db.find_by_id(id, self.collection_name)