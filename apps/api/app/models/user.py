from pydantic import BaseModel, EmailStr


class AuthIn(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    code: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    email: EmailStr
    token: str
    new_password: str


class GoogleAuthIn(BaseModel):
    token: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    name: str | None = None


class UserUpdateIn(BaseModel):
    name: str | None = None
    role: str | None = None
