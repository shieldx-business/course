from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, require_admin
from app.db.mongodb import get_db
from app.services import email as email_service

router = APIRouter()


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
    if coupon.get("expires_at") and coupon["expires_at"] < datetime.now(timezone.utc).isoformat():
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


def _calculate_amount(tier: dict, coupon: dict | None) -> int:
    base = tier["price_per_month"] * tier["duration_months"]
    if tier["duration_months"] >= 999:
        base = 999
    if coupon and coupon["discount_type"] == "percent":
        base = int(base * (1 - coupon["discount_value"] / 100))
    return base


async def _create_subscription_and_order(user_id: str, tier: dict, coupon: dict | None, provider: str, amount: float, external_id: str = ""):
    db = get_db()
    sub_id = f"sub-{user_id}-{datetime.now(timezone.utc).timestamp()}"
    order_id = f"ord-{sub_id}"
    now = datetime.now(timezone.utc)
    months = tier["duration_months"]

    subscription_doc = {
        "_id": sub_id,
        "user_id": user_id,
        "tier": tier["id"],
        "status": "active",
        "starts_at": now.isoformat(),
        "ends_at": _end_date(months).isoformat(),
        "external_id": external_id,
    }
    if provider == "stripe":
        subscription_doc["stripe_subscription_id"] = external_id
    await db.subscriptions.insert_one(subscription_doc)

    await db.orders.insert_one({
        "_id": order_id,
        "user_id": user_id,
        "subscription_id": sub_id,
        "amount": amount,
        "currency": "USD",
        "coupon_code": coupon["code"] if coupon else None,
        "payment_provider": provider,
        "payment_status": "paid",
        "external_id": external_id,
        "created_at": now.isoformat(),
    })

    if coupon and coupon.get("used_count") is not None and coupon.get("max_uses"):
        await db.coupons.update_one({"_id": coupon["_id"]}, {"$set": {"used_count": coupon["used_count"] + 1}})

    user = await db.users.find_one({"_id": user_id})
    if user:
        email_service.send_receipt(user["email"], tier["label"], amount, "USD", order_id, provider)
        email_service.send_welcome(user["email"])

    return sub_id, order_id


@router.post("/admin/renewal-reminders", dependencies=[Depends(require_admin)])
async def send_renewal_reminders(days: int = 7):
    db = get_db()
    subs = await email_service.find_renewals_due(db, days)
    sent = 0
    for sub in subs:
        user = await db.users.find_one({"_id": sub["user_id"]})
        if user:
            email_service.send_renewal_reminder(user["email"], sub.get("tier", "membership"), sub["ends_at"], days)
            sent += 1
    return {"sent": sent}
