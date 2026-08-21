from __future__ import annotations

import os
import sys
from typing import Optional

import requests
import urllib3
from requests.exceptions import SSLError
from pydantic_core import ValidationError as PydanticCoreValidationError

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class ConductorClientError(Exception):
    pass


class ConductorClient:
    def __init__(
        self,
        base_url: str,
        api_endpoint: str,
        api_token: str,
        email: str = "",
        auth_format: str = "bearer",
        auth_scheme: str = "Bearer",
        token_header: str = "Authorization",
        system_query_param: str = "system",
        verify_ssl: bool = True,
        ca_bundle_path: str = "",
        timeout_seconds: int = 20,
        ping_timeout_seconds: int = 15,
        ssh_key_path: str = "",
        ssh_username: str = "root",
        ssh_timeout_seconds: int = 10,
        ssh_default_username: str = "root",
        ssh_default_password: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_endpoint = api_endpoint.strip()
        self.api_token = api_token.strip()
        self.email = email.strip()
        self.auth_format = auth_format.strip().lower() if auth_format else "bearer"
        self.auth_scheme = auth_scheme.strip()
        self.token_header = token_header.strip() or "Authorization"
        self.system_query_param = system_query_param.strip() or "system"
        self.verify_ssl = verify_ssl
        self.ca_bundle_path = ca_bundle_path.strip()
        self.timeout_seconds = timeout_seconds
        self.ping_timeout_seconds = max(1, int(ping_timeout_seconds))
        self.ssh_key_path = ssh_key_path.strip()
        self.ssh_username = ssh_username.strip() or "root"
        self.ssh_timeout_seconds = max(1, int(ssh_timeout_seconds))
        self.ssh_default_username = ssh_default_username.strip() or "root"
        self.ssh_default_password = ssh_default_password
        self.session = requests.Session()

    @staticmethod
    def _get_field(obj: object, key: str):
        if obj is None:
            return None
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    @classmethod
    def _to_plain_dict(cls, obj: object):
        """Convert a pydantic model / nested object into a JSON-serializable dict."""
        if obj is None or isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, dict):
            return {key: cls._to_plain_dict(value) for key, value in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [cls._to_plain_dict(item) for item in obj]
        # pydantic v2 model
        model_dump = getattr(obj, "model_dump", None)
        if callable(model_dump):
            try:
                return cls._to_plain_dict(model_dump(mode="json"))
            except Exception:
                try:
                    return cls._to_plain_dict(model_dump())
                except Exception:
                    pass
        # pydantic v1 model
        dict_method = getattr(obj, "dict", None)
        if callable(dict_method):
            try:
                return cls._to_plain_dict(dict_method())
            except Exception:
                pass
        if hasattr(obj, "__dict__"):
            return {
                key: cls._to_plain_dict(value)
                for key, value in vars(obj).items()
                if not key.startswith("_")
            }
        return str(obj)

    def _query_system_controller(self, system_name: str, headers: dict) -> Optional[dict]:
        def query_system_via_http() -> Optional[object]:
            system_url = f"{self.base_url}/api/v1/system"
            response = self.session.get(
                system_url,
                params={
                    "items_per_page": 25,
                    "page_num": 1,
                    "arg_list": (
                        f'[{{"system_datas.name":{{"comparator":"like","value":"%{system_name}%"}}}},'
                        f'{{"system_datas.hostname_ip":{{"comparator":"like","value":"%{system_name}%"}}}}]'
                    ),
                },
                headers=headers,
                verify=self._verify_arg(),
                timeout=self.timeout_seconds,
            )
            if response.status_code != 200:
                return None
            try:
                return response.json()
            except ValueError:
                return None

        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        local_client_repo = os.path.join(repo_root, "at-scale-python-api")
        if os.path.isdir(local_client_repo) and local_client_repo not in sys.path:
            sys.path.insert(0, local_client_repo)

        # Ensure the at-scale client targets Conductor rather than any stale local ATS_URL.
        os.environ["ATS_URL"] = self.base_url
        os.environ["REQUEST_TIMEOUT"] = str(self.timeout_seconds)
        os.environ["VERIFY_CERTS"] = "true" if self.verify_ssl else "false"
        if self.ca_bundle_path:
            os.environ["REQUESTS_CA_BUNDLE"] = self.ca_bundle_path

        response_obj = None
        try:
            from ats_models.pydantic.conductor_query import ConductorQuery
            from at_scale_python_api.backend.system import System as SystemController

            controller = SystemController()

            query = ConductorQuery(
                items_per_page=25,
                page_num=1,
                arg_list=[
                    {
                        "system_datas.name": {
                            "comparator": "like",
                            "value": f"%{system_name}%",
                        }
                    },
                    {
                        "system_datas.hostname_ip": {
                            "comparator": "like",
                            "value": f"%{system_name}%",
                        }
                    },
                ],
            )
            response_obj = controller.get(query)
        except PydanticCoreValidationError:
            # Some environments return nullable fields that fail strict ats_models parsing.
            # Fallback to the same route with equivalent query filters using requests.
            response_obj = query_system_via_http()
        except Exception:
            # If at-scale client dependencies are missing, query Conductor directly.
            response_obj = query_system_via_http()

        if response_obj is None:
            return None

        if isinstance(response_obj, list):
            systems = response_obj
        else:
            systems = (
                self._get_field(response_obj, "items")
                or self._get_field(response_obj, "results")
                or self._get_field(response_obj, "data")
                or []
            )

        if not systems:
            return None

        selected = None
        for item in systems:
            sys_data = self._get_field(item, "system_datas")
            candidate_name = self._get_field(sys_data, "name") or self._get_field(sys_data, "hostname_ip")
            if candidate_name and str(candidate_name).strip().lower() == system_name.lower():
                selected = item
                break
        if selected is None:
            selected = systems[0]

        # Complete record with every nested field (pool, apu/SKU, locale, labels,
        # platform, device data, ssh data, maas data, system state, etc.).
        details = self._to_plain_dict(selected)
        
        return {
            "details": details
        }

    def _verify_arg(self):
        if self.ca_bundle_path:
            return self.ca_bundle_path
        return self.verify_ssl

    def _build_headers(self) -> dict:
        headers = {"Accept": "application/json"}
        if not self.api_token:
            return headers

        if self.token_header.lower() == "authorization":
            if self.auth_format in ("email_key", "email:key", "conductor"):
                token_value = f"{self.email}:{self.api_token}" if self.email else self.api_token
            else:
                token_value = self.api_token
                if self.auth_scheme and not token_value.lower().startswith(self.auth_scheme.lower() + " "):
                    token_value = f"{self.auth_scheme} {token_value}"
            headers[self.token_header] = token_value
        else:
            headers[self.token_header] = self.api_token

        return headers

    def fetch_systems_by_locale(self, locale_name: str) -> list[dict]:
        """Return a list of {name, hostname_ip} for all systems in the given locale."""
        headers = self._build_headers()
        systems_url = f"{self.base_url}/api/v1/system"
        arg_list = (
            f'[{{"locales.name":{{"comparator":"like","value":"%{locale_name}%"}}}}]'
        )

        results = []
        page = 1
        while True:
            try:
                resp = self.session.get(
                    systems_url,
                    params={"items_per_page": 100, "page_num": page, "arg_list": arg_list},
                    headers=headers,
                    verify=self._verify_arg(),
                    timeout=self.timeout_seconds,
                )
            except requests.Timeout:
                raise
            if resp.status_code != 200:
                break
            try:
                payload = resp.json()
            except ValueError:
                break

            if isinstance(payload, list):
                items = payload
            else:
                items = (
                    payload.get("items")
                    or payload.get("results")
                    or payload.get("data")
                    or []
                )

            if not items:
                break

            for item in items:
                item = self._to_plain_dict(item)
                sys_data = item.get("system_datas") or {}
                name = sys_data.get("name") or sys_data.get("hostname_ip")
                if name:
                    results.append(name)

            # Stop if we got fewer than a full page
            if len(items) < 100:
                break
            page += 1

        return results

    def fetch_system_health(self, system_name: str) -> dict:
        if not system_name or not system_name.strip():
            raise ConductorClientError("System name is required.")

        clean_name = system_name.strip()
        headers = self._build_headers()

        try:
            system_controller_data = self._query_system_controller(clean_name, headers)
            return system_controller_data

        except SSLError as exc:
            raise ConductorClientError(
                "TLS certificate verification failed. Set CONDUCTOR_VERIFY_SSL=false temporarily or configure CONDUCTOR_CA_BUNDLE_PATH."
            ) from exc
