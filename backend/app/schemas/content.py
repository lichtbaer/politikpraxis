from pydantic import BaseModel
from typing import Any


class ContentBundleResponse(BaseModel):
    characters: list[dict[str, Any]]
    events: list[dict[str, Any]]
    charEvents: dict[str, dict[str, Any]]
    laws: list[dict[str, Any]]
    bundesrat: list[dict[str, Any]]
    scenario: dict[str, Any]
