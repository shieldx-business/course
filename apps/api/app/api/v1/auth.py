from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.mongodb import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token

router = APIRouter()


class AuthIn(BaseModel):
    email: str
    password: str


class OTPIn(BaseModel):
    phone: str
    code: str | None = None


@router.post("/signup")
async def signup(body: AuthIn):
    db = get_db()
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Account already exists")
    user = {
        "_id": f"user-{body.email}",
        "email": body.email,
        "password_hash": hash_password(body.password),
        "phone": None,
        "phone_verified": False,
        "role": "user",
    }
    await db.users.insert_one(user)
    return {"id": user["_id"], "email": user["email"], "role": user["role"]}


@router.post("/login")
async def login(body: AuthIn):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token_data = {"sub": user["_id"], "email": user["email"], "role": user["role"]}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {"id": user["_id"], "email": user["email"], "role": user["role"]},
    }


@router.post("/otp/request")
async def request_otp(body: OTPIn):
    return {"message": "OTP sent", "phone": body.phone}


@router.post("/otp/verify")
async def verify_otp(body: OTPIn):
    if not body.code or len(body.code) != 6:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    return {"verified": True, "trial_active": True, "trial_expires": "2026-07-25T23:59:59Z"}
