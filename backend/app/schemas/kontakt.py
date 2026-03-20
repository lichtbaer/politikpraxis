from pydantic import BaseModel, EmailStr, Field, field_validator

BETREFF_OPTIONEN = (
    "Allgemeine Anfrage",
    "Feedback zum Spiel",
    "Technisches Problem",
    "Datenschutzanfrage",
    "Presse & Kooperationen",
)


class KontaktAnfrage(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    betreff: str = Field(min_length=1)
    nachricht: str = Field(min_length=20, max_length=2000)
    website: str = Field(default="", description="Honeypot — muss leer bleiben")

    @field_validator("betreff")
    @classmethod
    def validate_betreff(cls, v: str) -> str:
        if v not in BETREFF_OPTIONEN:
            raise ValueError("Ungültiger Betreff")
        return v


class KontaktResponse(BaseModel):
    success: bool
