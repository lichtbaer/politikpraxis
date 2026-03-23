from uuid import UUID

from pydantic import BaseModel, Field, field_validator

KONTEXT_OPTIONEN = ("header", "spielende")


class UserTestFeedbackCreate(BaseModel):
    session_id: str = Field(min_length=8, max_length=128)
    game_stat_id: str | None = None
    kontext: str = Field(default="header")

    bewertung_gesamt: int | None = Field(default=None, ge=1, le=5)
    verstaendlichkeit: int | None = Field(default=None, ge=1, le=5)
    fehler_gemeldet: bool = False
    fehler_beschreibung: str | None = Field(default=None, max_length=1000)
    positives: str | None = Field(default=None, max_length=1000)
    verbesserungen: str | None = Field(default=None, max_length=1000)
    sonstiges: str | None = Field(default=None, max_length=1000)

    @field_validator("kontext")
    @classmethod
    def validate_kontext(cls, v: str) -> str:
        if v not in KONTEXT_OPTIONEN:
            raise ValueError(
                f"Ungültiger Kontext. Erlaubt: {', '.join(KONTEXT_OPTIONEN)}"
            )
        return v

    @field_validator("game_stat_id")
    @classmethod
    def validate_game_stat_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        try:
            UUID(v)
        except ValueError as exc:
            raise ValueError("Ungültige game_stat_id (muss UUID sein)") from exc
        return v


class UserTestFeedbackResponse(BaseModel):
    id: str
    created_at: str
