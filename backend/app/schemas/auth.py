from pydantic import BaseModel, EmailStr, Field, field_validator

# bcrypt truncates/rejects secrets over 72 bytes — validate here so long
# (especially multi-byte) passwords fail with a clean 422 instead of a
# bcrypt ValueError surfacing as a 500.
BCRYPT_MAX_BYTES = 72


def _validate_bcrypt_byte_length(value: str) -> str:
    if len(value.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Passwort darf höchstens {BCRYPT_MAX_BYTES} Byte lang sein")
    return value


class MagicLinkEmailRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    _validate_password_bytes = field_validator("password")(_validate_bcrypt_byte_length)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    _validate_password_bytes = field_validator("password")(_validate_bcrypt_byte_length)


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

    _validate_password_bytes = field_validator("new_password")(
        _validate_bcrypt_byte_length
    )
