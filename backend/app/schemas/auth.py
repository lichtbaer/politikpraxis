from pydantic import BaseModel, EmailStr, Field, field_validator

# bcrypt hasht nur die ersten 72 Bytes eines Passworts; neuere bcrypt-Versionen
# werfen bei Überschreitung sogar einen ValueError (→ 500 statt 4xx). Da UTF-8
# Multibyte-Zeichen mehr als 1 Byte belegen, reicht eine reine Zeichen-Obergrenze
# (max_length=128) nicht aus — wir validieren zusätzlich die Byte-Länge.
MAX_PASSWORD_BCRYPT_BYTES = 72


def _validate_password_bcrypt_length(value: str) -> str:
    if len(value.encode("utf-8")) > MAX_PASSWORD_BCRYPT_BYTES:
        raise ValueError(
            f"Password must be at most {MAX_PASSWORD_BCRYPT_BYTES} bytes (UTF-8 encoded)"
        )
    return value


class MagicLinkEmailRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    _validate_password_length = field_validator("password")(
        _validate_password_bcrypt_length
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    _validate_password_length = field_validator("password")(
        _validate_password_bcrypt_length
    )


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str


class MessageResponse(BaseModel):
    detail: str = "ok"


class PasswordResetRequestBody(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)

    _validate_password_length = field_validator("new_password")(
        _validate_password_bcrypt_length
    )
