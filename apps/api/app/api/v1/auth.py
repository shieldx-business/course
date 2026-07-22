from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

fake_users = {}


class AuthIn(BaseModel):
    email: str
    password: str


class OTPIn(BaseModel):
    phone: str
    code: str | None = None


@router.post("/signup")
async def signup(body: AuthIn):
    if body.email in fake_users:
        raise HTTPException(status_code=400, detail="Account already exists")
    fake_users[body.email] = body.password
    return {"id": "user-" + str(len(fake_users)), "email": body.email, "role": "user"}


@router.post("/login")
async def login(body: AuthIn):
    if fake_users.get(body.email) != body.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": "fake-access-token",
        "refresh_token": "fake-refresh-token",
        "user": {"id": "user-1", "email": body.email, "role": "user"},
    }


@router.post("/otp/request")
async def request_otp(body: OTPIn):
    return {"message": "OTP sent", "phone": body.phone}


@router.post("/otp/verify")
async def verify_otp(body: OTPIn):
    if not body.code or len(body.code) != 6:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    return {"verified": True, "trial_active": True, "trial_expires": "2026-07-25T23:59:59Z"}
