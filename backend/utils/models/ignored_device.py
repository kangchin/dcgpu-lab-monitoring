from utils.factory.validation import Validator
from utils.factory.database import Database


class IgnoredDevice(object):
    def __init__(self):
        self.validator = Validator()
        self.db = Database()

        self.collection_name = "ignored_devices"  # collection name

        self.fields = {
            "hostname": "string",  # Hostname to ignore
            "device_type": "string",  # "system" or "pdu"
            "reason": "string",  # Why it's ignored
            "ignored_by": "string",  # Admin who ignored it
            "created": "datetime",
            "updated": "datetime",
        }

        self.create_required_fields = ["hostname", "device_type", "ignored_by"]

        self.create_optional_fields = ["reason", "created", "updated"]

        self.update_required_fields = []
        self.update_optional_fields = ["reason"]

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