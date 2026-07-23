from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.db.mongodb import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.deps import get_current_user
from app.services import cache as cache_service
from app.services import otp as otp_service

router = APIRouter()


class AuthIn(BaseModel):
    email: str
    password: str


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    code: str


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
        "trial_active": False,
        "trial_expires": None,
        "role": "user",
    }
    await db.users.insert_one(user)
    token_data = {"sub": user["_id"], "email": user["email"], "role": user["role"]}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {"id": user["_id"], "email": user["email"], "role": user["role"], "trial_active": False},
    }


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
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "role": user["role"],
            "phone_verified": user.get("phone_verified", False),
            "trial_active": user.get("trial_active", False),
            "trial_expires": user.get("trial_expires"),
        },
    }


@router.post("/otp/request")
async def request_otp(body: OTPRequest, user: dict = Depends(get_current_user)):
    cache = await cache_service.get_cache()
    code = otp_service.generate_otp()
    sanitized = "".join(c for c in body.phone if c.isdigit() or c == "+")
    await cache.setex(f"otp:{user['id']}:{sanitized}", 300, code)
    await otp_service.send_otp(sanitized, code)
    return {"message": "OTP sent", "phone": sanitized}


@router.post("/otp/verify")
async def verify_otp(body: OTPVerify, user: dict = Depends(get_current_user)):
    cache = await cache_service.get_cache()
    sanitized = "".join(c for c in body.phone if c.isdigit() or c == "+")
    stored = await cache.get(f"otp:{user['id']}:{sanitized}")
    if not stored or stored != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    db = get_db()
    trial_expires = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    await db.users.update_one(
        {"_id": user["id"]},
        {
            "$set": {
                "phone": sanitized,
                "phone_verified": True,
                "trial_active": True,
                "trial_expires": trial_expires,
            }
        },
    )
    await cache.delete(f"otp:{user['id']}:{sanitized}")

    updated = await db.users.find_one({"_id": user["id"]})
    token_data = {"sub": updated["_id"], "email": updated["email"], "role": updated["role"]}
    return {
        "verified": True,
        "trial_active": True,
        "trial_expires": trial_expires,
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {
            "id": updated["_id"],
            "email": updated["email"],
            "role": updated["role"],
            "phone_verified": True,
            "trial_active": True,
            "trial_expires": trial_expires,
        },
    }
