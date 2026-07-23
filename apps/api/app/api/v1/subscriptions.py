from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.config import settings
from app.db.mongodb import get_db

router = APIRouter()


def _calculate_amount(tier: dict, coupon: dict | None) -> int:
    base = tier["price_per_month"] * tier["duration_months"]
    if tier["duration_months"] >= 999:
        base = 999  # lifetime cap in dollars
    if coupon and coupon["discount_type"] == "percent":
        base = int(base * (1 - coupon["discount_value"] / 100))
    return base


def _end_date(months: int):
    if months >= 999:
        return datetime.max.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) + timedelta(days=30 * months)


@router.get("/subscriptions/tiers")
async def list_tiers():
    db = get_db()
    tiers = await db.tiers.find().sort("duration_months").to_list(20)
    return [{"id": t["_id"], **{k: v for k, v in t.items() if k != "_id"}} for t in tiers]


@router.get("/subscriptions/coupons/{code}")
async def validate_coupon(code: str):
    db = get_db()
    coupon = await db.coupons.find_one({"code": code.upper()})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon")
    if coupon.get("expires_at") and coupon["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Coupon expired")
    if coupon.get("max_uses") and coupon.get("used_count", 0) >= coupon["max_uses"]:
        raise HTTPException(status_code=404, detail="Coupon usage limit reached")
    return {"code": coupon["code"], "discount_type": coupon["discount_type"], "discount_value": coupon["discount_value"]}


@router.get("/subscriptions/me")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    db = get_db()
    sub = await db.subscriptions.find_one({"user_id": user["id"], "status": "active"})
    if not sub:
        return None
    return {
        "id": sub["_id"],
        "tier": sub["tier"],
        "status": sub["status"],
        "starts_at": sub["starts_at"],
        "ends_at": sub["ends_at"],
    }


@router.get("/subscriptions/orders")
async def get_my_orders(user: dict = Depends(get_current_user)):
    db = get_db()
    orders = await db.orders.find({"user_id": user["id"]}).to_list(100)
    return [{"id": o["_id"], **{k: v for k, v in o.items() if k != "_id"}} for o in orders]


class CheckoutIn(BaseModel):
    tier_id: str
    coupon_code: str | None = None
    payment_provider: str = "stripe"


async def _get_tier(tier_id: str):
    db = get_db()
    tier = await db.tiers.find_one({"_id": tier_id}) or await db.tiers.find_one({"id": tier_id})
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    return tier


async def _apply_coupon(code: str | None):
    if not code:
        return None
    db = get_db()
    coupon = await db.coupons.find_one({"code": code.upper()})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon")
    return coupon


async def _create_subscription(user_id: str, tier: dict, coupon: dict | None, provider: str, amount_cents: int):
    db = get_db()
    sub_id = f"sub-{user_id}-{datetime.now(timezone.utc).timestamp()}"
    order_id = f"ord-{sub_id}"
    now = datetime.now(timezone.utc)
    months = tier["duration_months"]

    await db.subscriptions.insert_one({
        "_id": sub_id,
        "user_id": user_id,
        "tier": tier["id"],
        "status": "active",
        "starts_at": now.isoformat(),
        "ends_at": _end_date(months).isoformat(),
    })

    await db.orders.insert_one({
        "_id": order_id,
        "user_id": user_id,
        "subscription_id": sub_id,
        "amount": amount_cents / 100,
        "currency": "USD",
        "coupon_code": coupon["code"] if coupon else None,
        "payment_provider": provider,
        "payment_status": "paid",
        "created_at": now.isoformat(),
    })

    return sub_id, order_id


@router.post("/checkout/session")
async def create_checkout(body: CheckoutIn, user: dict = Depends(get_current_user)):
    tier = await _get_tier(body.tier_id)
    coupon = await _apply_coupon(body.coupon_code) if body.coupon_code else None
    amount_cents = _calculate_amount(tier, coupon) * 100

    # If Stripe is configured, return a Stripe checkout URL (placeholder)
    if settings.stripe_secret_key:
        return {
            "session_url": "https://checkout.stripe.com/pay/demo",
            "provider": "stripe",
            "amount_cents": amount_cents,
        }

    # Dev/test fallback: immediately create subscription
    sub_id, order_id = await _create_subscription(user["id"], tier, coupon, body.payment_provider, amount_cents)
    return {
        "session_url": "/learn",
        "provider": "test",
        "subscription_id": sub_id,
        "order_id": order_id,
    }


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    # In production, verify Stripe signature with settings.stripe_webhook_secret
    body = await request.json()
    if body.get("type") == "checkout.session.completed":
        # Create subscription from session metadata
        pass
    return {"received": True}


@router.post("/webhooks/paypal")
async def paypal_webhook(request: Request):
    # In production, verify PayPal signature
    body = await request.json()
    return {"received": True}
