from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from app.core.deps import get_current_user
from app.models import CheckoutIn
from app.services import payment as payment_service
from app.api.v1.subscriptions import (
    _get_tier,
    _apply_coupon,
    _calculate_amount,
    _create_subscription_and_order,
)

router = APIRouter()


@router.post("/checkout/session")
async def create_checkout(body: CheckoutIn, user: dict = Depends(get_current_user)):
    tier = await _get_tier(body.tier_id)
    coupon = await _apply_coupon(body.coupon_code) if body.coupon_code else None
    amount = _calculate_amount(tier, coupon)

    success_url = f"{settings.frontend_url}/checkout?success=1&provider={body.payment_provider}"
    cancel_url = f"{settings.frontend_url}/checkout?canceled=1"

    if body.payment_provider == "stripe" and settings.stripe_secret_key:
        try:
            session_url = payment_service.create_stripe_checkout_session(
                user["id"], tier, coupon, success_url, cancel_url
            )
            return {"session_url": session_url, "provider": "stripe", "amount": amount}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    if body.payment_provider == "paypal" and settings.paypal_client_id and settings.paypal_client_secret:
        try:
            order = await payment_service.create_paypal_order(user["id"], tier, coupon)
            return {"order": order, "provider": "paypal", "amount": amount}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"PayPal error: {exc}")

    # Dev/test fallback: immediately create subscription
    sub_id, order_id = await _create_subscription_and_order(user["id"], tier, coupon, "test", amount)
    return {
        "session_url": "/learn",
        "provider": "test",
        "subscription_id": sub_id,
        "order_id": order_id,
        "amount": amount,
    }


@router.post("/checkout/paypal/capture")
async def capture_paypal(order_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await payment_service.capture_paypal_order(order_id)
        custom_id = result.get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])[0].get("custom_id", "")
        parts = custom_id.split("|")
        if len(parts) >= 2 and parts[0] == user["id"]:
            tier = await _get_tier(parts[1])
            coupon = await _apply_coupon(parts[2]) if len(parts) > 2 and parts[2] else None
            amount = _calculate_amount(tier, coupon)
            await _create_subscription_and_order(user["id"], tier, coupon, "paypal", amount, order_id)
        return {"captured": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"PayPal capture error: {exc}")
