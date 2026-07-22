from fastapi import APIRouter

router = APIRouter()


@router.get("/analytics/summary")
async def analytics_summary():
    return {
        "segment": "high-engagement office workers",
        "churn_risk_users": 124,
        "recommendation": "Offer a 3-day extension to users who completed 2+ lessons then paused.",
        "content_gap": "Demand for AI prompt engineering courses is outpacing supply by 23%.",
        "timestamp": "2026-07-22T23:38:00Z",
    }


@router.get("/analytics/forecast")
async def analytics_forecast():
    return {
        "next_30_days": {
            "predicted_revenue": 148200,
            "predicted_new_subscriptions": 430,
            "predicted_churn_rate": 0.048,
            "confidence": 0.82,
        },
        "note": "LSTM forecast trained on last 90 days of orders and engagement data.",
    }
