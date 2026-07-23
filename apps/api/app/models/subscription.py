from pydantic import BaseModel


class SubscriptionOverrideIn(BaseModel):
    tier_id: str
    duration_months: int | None = None
    ends_at: str | None = None
    status: str = "active"
