from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


class ModCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = ""
    content: dict[str, Any]
    version: str = "1.0.0"


class ModResponse(BaseModel):
    id: str
    author_id: str
    title: str
    description: str
    version: str
    downloads: int
    created_at: datetime


class ModDetailResponse(ModResponse):
    content: dict[str, Any]
