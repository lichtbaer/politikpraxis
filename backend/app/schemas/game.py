import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

MAX_AGENDA_IDS = 12
MAX_AGENDA_ID_LEN = 80
_ID_RE = re.compile(r"^[a-z0-9_]+$")


class AgendaUpdateRequest(BaseModel):
    """PATCH game_state spielerAgenda / koalitionsAgenda (SMA-503)."""

    spieler_agenda: list[str] = Field(default_factory=list, max_length=MAX_AGENDA_IDS)
    koalitions_agenda: list[str] | None = Field(None, max_length=MAX_AGENDA_IDS)

    @field_validator("spieler_agenda")
    @classmethod
    def validate_spieler_ids(cls, v: list[str]) -> list[str]:
        return _validate_agenda_id_list(v, "spieler_agenda")

    @field_validator("koalitions_agenda")
    @classmethod
    def validate_koalitions_ids(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return _validate_agenda_id_list(v, "koalitions_agenda")


def _validate_agenda_id_list(v: list[str], field: str) -> list[str]:
    if len(v) > MAX_AGENDA_IDS:
        raise ValueError(f"{field}: maximal {MAX_AGENDA_IDS} Einträge")
    out: list[str] = []
    for x in v:
        if not isinstance(x, str) or not x:
            raise ValueError(f"{field}: nur nicht-leere Strings")
        if len(x) > MAX_AGENDA_ID_LEN:
            raise ValueError(f"{field}: ID zu lang")
        if not _ID_RE.match(x):
            raise ValueError(f"{field}: ungültige Zeichen in ID")
        out.append(x)
    return out


class AgendaUpdateResponse(BaseModel):
    ok: bool = True
    game_state: dict[str, Any]


class AgendaEvalKoalitionMiss(BaseModel):
    id: str
    titel: str
    beziehung_malus: int


class AgendaEvalResponse(BaseModel):
    """SMA-506: Ergebnis der serverseitigen Agenda-Auswertung am Spielende."""

    ok: bool = True
    game_state: dict[str, Any]
    spieler_erfuellt: int
    spieler_gesamt: int
    spieler_note: str
    koalition_verfehlt: list[AgendaEvalKoalitionMiss] = Field(default_factory=list)
    koalition_beziehung_delta: int = 0
    already_applied: bool = False
