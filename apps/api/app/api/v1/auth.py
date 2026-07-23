import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from app.db.mongodb import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.deps import get_current_user
from app.core.config import settings
from app.services import cache as cache_service
from app.services import otp as otp_service
from app.services import email as email_service

router = APIRouter()


def _user_payload(user: dict):
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user.get("name") or "",
        "role": user["role"],
        "phone": user.get("phone"),
        "phone_verified": user.get("phone_verified", False),
        "trial_active": user.get("trial_active", False),
        "trial_expires": user.get("trial_expires"),
    }


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


@router.post("/signup")
async def signup(body: AuthIn):
    db = get_db()
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Account already exists")
    user = {
        "_id": f"user-{body.email}",
        "email": body.email,
        "name": body.name or "",
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
        "user": _user_payload(user),
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
        "user": _user_payload(user),
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
        "user": _user_payload(updated),
    }


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user:
        return {"message": "If the account exists, a reset email was sent."}

    token = secrets.token_urlsafe(32)
    cache = await cache_service.get_cache()
    await cache.setex(f"pwdreset:{body.email}:{token}", 900, "1")

    reset_url = f"{settings.frontend_url}/reset-password?email={body.email}&token={token}"
    email_service.send_password_reset(body.email, reset_url)
    return {"message": "If the account exists, a reset email was sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn):
    cache = await cache_service.get_cache()
    stored = await cache.get(f"pwdreset:{body.email}:{body.token}")
    if not stored:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    await cache.delete(f"pwdreset:{body.email}:{body.token}")
    return {"message": "Password updated"}


@router.post("/google")
async def google_auth(body: GoogleAuthIn):
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        idinfo = id_token.verify_oauth2_token(
            body.token,
            google_requests.Request(),
            settings.google_oauth_client_id,
            clock_skew_in_seconds=10,
        )
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}")

    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        user = {
            "_id": f"user-{email}",
            "email": email,
            "name": idinfo.get("name", ""),
            "password_hash": "",
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
        "user": _user_payload(user),
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


@router.put("/me")
async def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if updates:
        await db.users.update_one({"_id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"_id": user["id"]})
    return _user_payload(updated)


@router.put("/me/password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    db = get_db()
    db_user = await db.users.find_one({"_id": user["id"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.get("password_hash") and not verify_password(body.old_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    await db.users.update_one({"_id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "Password updated"}
