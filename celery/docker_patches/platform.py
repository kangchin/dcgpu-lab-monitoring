from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class Platform(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    date_create: datetime
    name: str
    short_name: str
    platform_schema: Dict = Field(alias="schema")
    system_config_template_id: Union[str, None]


class PowerController(BaseModel):
    ip: str
    user: Union[str, None] = Field(default=None)
    password: Union[str, None] = Field(
        default=None,
        alias="pass",
        serialization_alias="pass",
    )
    port: Union[int, str, None] = Field(default=None)
    type: str = Field(
        default=None, description="Type of power controller, e.g., 'bmc', 'ipmi', etc."
    )

    @model_serializer(mode="wrap")
    def serialize_exclude_none(
        self, wrap: Callable[["PowerController"], dict[str, Any]]
    ) -> dict[str, Any]:
        values = wrap(self)
        return {key: value for key, value in values.items() if value is not None}


class PowerDistribution(BaseModel):
    hostname_ip_url: str
    user: str
    password: Optional[str] = Field(
        default=None,
        alias="pass",
        serialization_alias="pass",
    )
    outlet: int
    connection_type: Optional[str] = None


class ExternalJtag(BaseModel):
    type: str
    ip: Union[str, None] = Field(default=None)
    user: Union[str, None] = Field(default=None)
    password: Union[str, None] = Field(
        default=None,
        alias="pass",
        serialization_alias="pass",
    )
    port: Union[int, str, None] = Field(default=None)

    @model_serializer(mode="wrap")
    def serialize_exclude_none(
        self, wrap: Callable[["ExternalJtag"], dict[str, Any]]
    ) -> dict[str, Any]:
        values = wrap(self)
        return {key: value for key, value in values.items() if value is not None}


class PlatformConfig(BaseModel):
    num_dcgpus: Optional[int] = Field(default=0)
    num_sockets: Optional[int] = Field(default=0)
    external_jtag: List[ExternalJtag] = Field(default_factory=list)
    power_controllers: List[PowerController] = Field(default_factory=list)
    power_distribution: List[PowerDistribution] = Field(default_factory=list)
    notes: Union[str, None] = Field(default=None)

    @model_serializer(mode="wrap")
    def serialize_exclude_none(
        self, wrap: Callable[["PlatformConfig"], dict[str, Any]]
    ) -> dict[str, Any]:
        values = wrap(self)
        return {key: value for key, value in values.items() if value is not None}
