"""Validates mod content against expected schemas."""
from typing import Any


REQUIRED_CHARACTER_FIELDS = {"id", "name", "role", "initials", "color", "mood", "loyalty", "bio", "interests", "bonus", "ultimatum"}
REQUIRED_EVENT_FIELDS = {"id", "type", "icon", "typeLabel", "title", "quote", "context", "choices", "ticker"}
REQUIRED_LAW_FIELDS = {"id", "titel", "kurz", "desc", "tags", "ja", "nein", "effekte", "lag"}
VALID_EVENT_TYPES = {"danger", "warn", "good", "info"}
VALID_CHOICE_TYPES = {"safe", "primary", "danger"}
VALID_TAGS = {"bund", "eu", "land", "kommune", "kommunen"}


class ValidationError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {'; '.join(errors)}")


def validate_mod_content(content: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    if "characters" in content:
        for i, char in enumerate(content["characters"]):
            missing = REQUIRED_CHARACTER_FIELDS - set(char.keys())
            if missing:
                errors.append(f"Character [{i}]: missing fields {missing}")
            if not isinstance(char.get("mood", 0), int) or not 0 <= char.get("mood", -1) <= 4:
                errors.append(f"Character [{i}]: mood must be 0-4")
            if not isinstance(char.get("loyalty", 0), int) or not 0 <= char.get("loyalty", -1) <= 5:
                errors.append(f"Character [{i}]: loyalty must be 0-5")

    if "events" in content:
        for i, ev in enumerate(content["events"]):
            missing = REQUIRED_EVENT_FIELDS - set(ev.keys())
            if missing:
                errors.append(f"Event [{i}]: missing fields {missing}")
            if ev.get("type") not in VALID_EVENT_TYPES:
                errors.append(f"Event [{i}]: invalid type '{ev.get('type')}'")
            for j, ch in enumerate(ev.get("choices", [])):
                if ch.get("type") not in VALID_CHOICE_TYPES:
                    errors.append(f"Event [{i}] choice [{j}]: invalid type '{ch.get('type')}'")
                if not isinstance(ch.get("cost", 0), (int, float)) or ch.get("cost", 0) < 0:
                    errors.append(f"Event [{i}] choice [{j}]: cost must be >= 0")

    if "laws" in content:
        for i, law in enumerate(content["laws"]):
            missing = REQUIRED_LAW_FIELDS - set(law.keys())
            if missing:
                errors.append(f"Law [{i}]: missing fields {missing}")
            for tag in law.get("tags", []):
                if tag not in VALID_TAGS:
                    errors.append(f"Law [{i}]: invalid tag '{tag}'")

    return errors
