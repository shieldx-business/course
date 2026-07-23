from pydantic import BaseModel


class CheckoutIn(BaseModel):
    tier_id: str
    coupon_code: str | None = None
    payment_provider: str = "stripe"
