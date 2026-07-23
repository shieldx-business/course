import hmac
import hashlib
import random
from app.core.config import settings


def _hash_code(code: str) -> str:
    """Hash a 6-digit OTP before storing in Redis."""
    secret = settings.jwt_secret.encode("utf-8")
    return hmac.new(secret, code.encode("utf-8"), hashlib.sha256).hexdigest()[:32]


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _sanitize_phone(phone: str) -> str:
    return "".join(c for c in phone if c.isdigit() or c == "+")


def _otp_log_message(phone: str, code: str) -> str:
    return f"[DEV OTP] phone={_sanitize_phone(phone)} code={code}"


def _otp_key(phone: str) -> str:
    return f"otp:{_sanitize_phone(phone)}"


async def send_otp(phone: str, code: str):
    """Send OTP via Twilio if configured, otherwise log to console for local dev."""
    if settings.sms_provider_api_key and settings.sms_provider_api_key.startswith("twilio:"):
        parts = settings.sms_provider_api_key.split(":")
        if len(parts) >= 4:
            account_sid, auth_token, from_number = parts[1], parts[2], parts[3]
            try:
                from twilio.rest import Client

                client = Client(account_sid, auth_token)
                client.messages.create(body=f"Your Ascendly verification code is {code}", from_=from_number, to=_sanitize_phone(phone))
                return
            except Exception as exc:
                print(_otp_log_message(phone, code) + f" | twilio failed: {exc}")
                return
    print(_otp_log_message(phone, code))


async def store_otp(cache, phone: str, code: str, ttl_seconds: int = 300) -> str:
    key = _otp_key(phone)
    await cache.setex(key, ttl_seconds, _hash_code(code))
    return key


async def verify_otp(cache, phone: str, code: str) -> bool:
    stored = await cache.get(_otp_key(phone))
    if not stored:
        return False
    return hmac.compare_digest(stored, _hash_code(code))
