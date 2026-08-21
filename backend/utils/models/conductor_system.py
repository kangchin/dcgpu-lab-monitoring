from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SystemHealth:
    details: Optional[dict[str, Any]] = field(default=None)
