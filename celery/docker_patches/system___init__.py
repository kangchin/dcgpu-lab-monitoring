import uuid
from datetime import datetime
from typing import Any, Callable, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, model_serializer, model_validator

from ats_models.pydantic.jump_host import JumpHost
from ats_models.pydantic.locale import Locale
from ats_models.pydantic.peripherals.rack_manager import RackManager
from ats_models.pydantic.peripherals.switch import Switch
from ats_models.pydantic.pool import Pool
from ats_models.pydantic.system.apu import ApuSku
from ats_models.pydantic.system.labels import SystemLabel
from ats_models.pydantic.system.platform import Platform, PlatformConfig
from ats_models.pydantic.system.scraped_data import (
    SystemDeviceData,
    SystemMaasData,
    SystemSshData,
)


class CreateSystemData(BaseModel):
    platform_id: str
    name: str
    hostname_ip: str
    username: Union[str, None] = Field(default=None)
    godzilla_asset_id: Union[str, None] = Field(default=None)
    platform_config: PlatformConfig


class CreateSystemState(BaseModel):
    ssh_enabled: bool = Field(default=True)
    ssh_optout_reason: Union[str, None] = Field(default=None)
    ssh_optout_reason_by: Union[str, None] = Field(default=None)
    disabled: bool = Field(default=False)
    disabled_by: Union[str, None] = Field(default=None)
    disabled_reason: Union[str, None] = Field(default=None)


class CreateSystemSources(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Union[Literal["MAAS", "MANUAL"], None] = Field(default="MANUAL")
    details: Union[Dict, None] = Field(default=None)


class CreateSystem(BaseModel):
    pool_id: str
    system_datas: CreateSystemData
    locale_id: uuid.UUID
    apu_sku_id: str
    system_label_ids: List[str]
    rack_manager_id: Union[str, None] = Field(default=None)
    switch_ids: List[str] = Field(default_factory=list)
    password: Union[str, None] = Field(default=None)
    jump_host_id: Union[uuid.UUID, None] = Field(default=None)
    reservation_only: bool = False
    system_states: CreateSystemState = Field(
        default_factory=lambda: CreateSystemState(ssh_enabled=True, disabled=False),
    )

    @model_validator(mode="before")
    @classmethod
    def username_and_pass_must_be_provided_if_ssh_auth_off(
        cls, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        system_datas = data["system_datas"]
        system_states = data["system_states"]

        if isinstance(system_datas, dict):
            username = system_datas.get("username")
        elif isinstance(system_datas, CreateSystemData):
            username = system_datas.username
        password = data.get("password")

        if isinstance(system_states, dict):
            ssh_enabled = system_states.get("ssh_enabled")
        elif isinstance(system_states, CreateSystemState):
            ssh_enabled = system_states.ssh_enabled

        if ssh_enabled is False and username is None and password is None:
            raise ValueError("If ssh_enabled is False, username and password must be provided.")

        return data

    @model_serializer(mode="wrap")
    def serialize_exclude_none(
        self, wrap: Callable[["CreateSystem"], dict[str, Any]]
    ) -> dict[str, Any]:
        values = wrap(self)
        return {key: value for key, value in values.items() if value is not None}


class UpdateSystem(CreateSystem):
    id: str


class SystemState(CreateSystemState):
    id: str
    date_create: datetime
    disable_return_online_time: datetime
    maas_ingressed: bool
    date_reimaged: datetime
    date_last_job_complete: datetime
    utilization_24hrs: Optional[float] = None
    utilization_7d: Optional[float] = None


class SystemSources(CreateSystemSources):
    date_create: datetime


class SystemData(CreateSystemData):
    id: str
    date_create: datetime
    platforms: Platform


class System(BaseModel):
    id: str
    date_create: datetime
    locales: Locale
    apu_skus: ApuSku
    pool_id: str
    pool: Pool
    password: Union[str, None] = Field(default=None)
    reservation_only: bool
    system_datas: SystemData
    system_states: SystemState
    system_ssh_data: SystemSshData
    system_device_data: SystemDeviceData
    system_maas_data: SystemMaasData
    rack_manager: Optional[RackManager]
    switches: List[Switch] = Field(default_factory=list)
    system_labels: List[SystemLabel]
    system_history_association_id: Optional[str]
    system_pool_association_id: Optional[str]
    archived: bool
    jump_host: Optional[JumpHost] = Field(default=None)