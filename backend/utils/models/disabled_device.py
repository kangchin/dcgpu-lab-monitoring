from utils.factory.validation import Validator
from utils.factory.database import Database


class DisabledDevice(object):
    def __init__(self):
        self.validator = Validator()
        self.db = Database()

        self.collection_name = "disabled"

        self.fields = {
            "entity_type": "string",   # "system" or "pdu"
            "entity_id": "string",     # original _id from systems/pdus collection
            "entity_name": "string",   # system name or PDU hostname
            "last_seen": "datetime",   # last time detected by nmap
            "disabled_at": "datetime", # when moved to disabled
            "original_data": "object", # full snapshot of the original record
        }

        self.create_required_fields = ["entity_type", "entity_id", "entity_name"]
        self.create_optional_fields = ["last_seen", "disabled_at", "original_data"]
        self.update_required_fields = []
        self.update_optional_fields = ["last_seen", "disabled_at"]

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

    def update(self, id, data):
        self.validator.validate(
            data,
            self.fields,
            self.update_required_fields,
            self.update_optional_fields,
        )
        return self.db.update(id, data, self.collection_name)

    def delete(self, id):
        return self.db.delete(id, self.collection_name)