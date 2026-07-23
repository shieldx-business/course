from fastapi import APIRouter, Request, HTTPException
from app.db.mongodb import get_db
from app.services import payment as payment_service
from app.api.v1.subscriptions import (
    _get_tier,
    _apply_coupon,
    _calculate_amount,
    _create_subscription_and_order,
)

router = APIRouter()


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = payment_service.verify_stripe_event(payload, sig_header)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook verification failed: {exc}")

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        user_id = metadata.get("user_id")
        tier_id = metadata.get("tier_id")
        coupon_code = metadata.get("coupon_code")
        if not user_id or not tier_id:
            return {"received": True, "note": "Missing metadata"}

        db = get_db()
        user = await db.users.find_one({"_id": user_id})
        if not user:
            return {"received": True, "note": "User not found"}

        tier = await _get_tier(tier_id)
        coupon = await _apply_coupon(coupon_code) if coupon_code else None
        amount = session.get("amount_total", _calculate_amount(tier, coupon) * 100) / 100
        await _create_subscription_and_order(user_id, tier, coupon, "stripe", amount, session.get("id"))

    return {"received": True}


@router.post("/webhooks/paypal")
async def paypal_webhook(request: Request):
    body = await request.body()
    try:
        event = await payment_service.verify_paypal_event(dict(request.headers), body)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PayPal webhook verification failed: {exc}")

    event_type = event.get("event_type")
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        resource = event.get("resource", {})
        custom_id = resource.get("custom_id", "")
        parts = custom_id.split("|")
        if len(parts) >= 2:
            user_id, tier_id, coupon_code = parts[0], parts[1], parts[2] if len(parts) > 2 else None
            db = get_db()
            user = await db.users.find_one({"_id": user_id})
            if user:
                tier = await _get_tier(tier_id)
                coupon = await _apply_coupon(coupon_code) if coupon_code else None
                amount = float(resource.get("amount", {}).get("value", _calculate_amount(tier, coupon)))
                await _create_subscription_and_order(user_id, tier, coupon, "paypal", amount, resource.get("id"))

    return {"received": True}
