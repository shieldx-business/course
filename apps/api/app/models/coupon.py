from pydantic import BaseModel


class CouponIn(BaseModel):
    code: str
    discount_type: str = "percent"
    discount_value: float
    max_uses: int | None = None
    expires_at: str | None = None
