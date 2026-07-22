from fastapi import APIRouter, HTTPException
from app.db.mongodb import get_db

router = APIRouter()


@router.get("/subscriptions/tiers")
async def list_tiers():
    db = get_db()
    tiers = await db.tiers.find().sort("duration_months").to_list(20)
    return [{"id": t["_id"], **{k: v for k, v in t.items() if k != "_id"}} for t in tiers]


@router.get("/subscriptions/coupons/{code}")
async def validate_coupon(code: str):
    valid = ["LAUNCH20"]
    if code.upper() not in valid:
        raise HTTPException(status_code=404, detail="Invalid coupon")
    return {"code": code.upper(), "discount_type": "percent", "discount_value": 20}


@router.post("/checkout/session")
async def create_checkout():
    return {"session_url": "https://stripe.com/demo-checkout"}
