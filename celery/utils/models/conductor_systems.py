from utils.factory.validation import Validator
from utils.factory.database import Database
from datetime import datetime

class ConductorSystems(object):
    def __init__(self):
        self.validator = Validator()
        self.db = Database()
        self.collection_name = "conductor_systems"

        self.fields = {
            "system": "string",
            "site": "string",
            "location": "string",
            "bmc_ip": "string",
            "username": "string",
            "password": "string",
            "conn_type": "string",
            "created": "datetime",
            "updated": "datetime",
        }

        self.create_required_fields = ["system", "created", "updated"]
        self.create_optional_fields = [
            "site", "location", "bmc_ip", "username", "password",
            "conn_type",
        ]

        self.update_required_fields = []
        self.update_optional_fields = [
            "system", "site", "location", "bmc_ip", "username", "password",
            "conn_type",
            "updated",
        ]

    def create(self, data):
        self.validator.validate(
            data,
            self.fields,
            self.create_required_fields,
            self.create_optional_fields,
        )
        return self.db.insert(data, self.collection_name)

    def find(self, query, sort=None, limit=0):
        return self.db.find(query, self.collection_name, sort=sort, limit=limit)

    def update(self, id, data):
        self.validator.validate(
            data,
            self.fields,
            self.update_required_fields,
            self.update_optional_fields,
        )
        return self.db.update(id, data, self.collection_name)

    def upsert_by_system(self, system_name: str, data: dict):
        now = datetime.utcnow()
        existing = self.find({"system": system_name})

        if existing and len(existing) > 0:
            doc = existing[0]
            data["created"] = doc.get("created", now)
            data["updated"] = now
            return self.update(doc["_id"], data)

        data["created"] = now
        data["updated"] = now
        return self.create(data)
