from datetime import datetime, timezone
from statistics import mean
from typing import Any
import numpy as np
from app.core.config import settings


def _daily_totals(orders: list[dict]) -> list[float]:
    by_day: dict[str, float] = {}
    for o in orders:
        created = o.get("created_at", "")
        if not created:
            continue
        day = created[:10]
        by_day[day] = by_day.get(day, 0) + o.get("amount", 0)
    return list(by_day.values())


def _moving_average(values: list[float], window: int) -> list[float]:
    if not values:
        return []
    n = len(values)
    result = []
    for i in range(1, n + 1):
        start = max(0, i - window)
        result.append(mean(values[start:i]))
    return result


def _naive_forecast(orders: list[dict], horizon_days: int) -> dict[str, Any]:
    values = _daily_totals(orders)
    if len(values) < 2:
        return {"predicted_revenue": 0.0, "confidence": 0.1, "note": "Not enough order history for a reliable forecast."}

    ma = _moving_average(values, 7)
    trend = (values[-1] - values[0]) / (len(values) - 1) if len(values) > 1 else 0
    last_ma = ma[-1] if ma else 0
    total = 0.0
    for i in range(1, horizon_days + 1):
        total += max(0, last_ma + trend * i)

    avg = mean(values)
    std = (sum((v - avg) ** 2 for v in values) / len(values)) ** 0.5
    confidence = max(0.1, min(0.95, 1 - (std / (avg + 1e-6)) * 0.5)) if avg else 0.1
    return {
        "predicted_revenue": round(total, 2),
        "confidence": round(confidence, 2),
        "note": "Fallback moving-average trend forecast due to insufficient data or model unavailability.",
        "model": "fallback",
    }


def _build_lstm_forecast(values: list[float], horizon_days: int) -> dict[str, Any] | None:
    try:
        import tensorflow as tf
    except Exception:
        return None

    if len(values) < 14:
        return None

    # Normalize
    arr = np.array(values, dtype=np.float32).reshape(-1, 1)
    min_v = arr.min()
    max_v = arr.max()
    if max_v - min_v == 0:
        return None
    norm = (arr - min_v) / (max_v - min_v)

    seq_len = 7
    X, y = [], []
    for i in range(seq_len, len(norm)):
        X.append(norm[i - seq_len:i])
        y.append(norm[i])
    X = np.array(X)
    y = np.array(y)

    if len(X) < 5:
        return None

    tf.random.set_seed(42)
    model = tf.keras.Sequential([
        tf.keras.layers.LSTM(32, input_shape=(seq_len, 1)),
        tf.keras.layers.Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")
    model.fit(X, y, epochs=50, verbose=0, batch_size=4)

    # Iterative forecast
    last_seq = norm[-seq_len:].reshape(1, seq_len, 1)
    preds = []
    for _ in range(horizon_days):
        nxt = model.predict(last_seq, verbose=0)[0, 0]
        preds.append(nxt)
        last_seq = np.append(last_seq[:, 1:, :], [[[nxt]]], axis=1)

    predictions = np.array(preds) * (max_v - min_v) + min_v
    total = float(np.sum(predictions))
    std = float(np.std(predictions)) if len(predictions) > 1 else 0.0
    avg = total / horizon_days
    confidence = max(0.1, min(0.95, 1 - (std / (avg + 1e-6)) * 0.5)) if avg else 0.1
    return {
        "predicted_revenue": round(total, 2),
        "confidence": round(confidence, 2),
        "note": "Trained a univariate LSTM model on daily revenue totals to forecast the next 30 days.",
        "model": "lstm",
    }


def forecast_revenue(orders: list[dict], horizon_days: int = 30) -> dict[str, Any]:
    values = _daily_totals(orders)
    if len(values) < 2:
        return {"predicted_revenue": 0.0, "confidence": 0.1, "note": "Not enough order history for a reliable forecast.", "model": "none"}

    lstm = _build_lstm_forecast(values, horizon_days)
    if lstm:
        return lstm
    return _naive_forecast(orders, horizon_days)


def forecast_new_subscriptions(orders: list[dict], avg_order_value: float = 50.0, horizon_days: int = 30) -> dict[str, Any]:
    revenue_forecast = forecast_revenue(orders, horizon_days)
    predicted = int(revenue_forecast["predicted_revenue"] / max(avg_order_value, 1))
    return {"predicted_new_subscriptions": max(0, predicted), "avg_order_value": avg_order_value}


def forecast_churn(progress: list[dict], subscriptions: list[dict]) -> dict[str, Any]:
    active_ids = {s.get("user_id") for s in subscriptions if s.get("status") == "active"}
    learner_ids = {p.get("user_id") for p in progress}
    inactive_learners = learner_ids - active_ids
    total_learners = len(learner_ids)
    churn_rate = round(len(inactive_learners) / total_learners, 3) if total_learners else 0.0
    return {"predicted_churn_rate": churn_rate, "churn_risk_users": len(inactive_learners)}


def _rule_based_summary(metrics: dict[str, Any]) -> str:
    segment = metrics.get("segment", "general")
    churn = metrics.get("churn_risk_users", 0)
    active = metrics.get("active_subscriptions", 0)
    top = metrics.get("top_category", "N/A")
    return (
        f"The current user base is best described as '{segment}'. "
        f"There are {churn} learners showing churn signals versus {active} active subscriptions. "
        f"Top content category is {top}. "
        f"Recommendation: re-engage at-risk learners with a short extension or personalized course suggestions."
    )


def summarize_with_llm(metrics: dict[str, Any]) -> dict[str, Any]:
    if settings.openai_api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.openai_api_key)
            prompt = (
                "You are an expert ed-tech growth analyst. Based on these metrics, write a 2-3 sentence "
                "executive summary and one actionable recommendation.\n\nMetrics:\n"
                f"{metrics}"
            )
            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
            )
            text = response.choices[0].message.content or ""
            return {"summary": text.strip(), "model": settings.openai_model, "source": "openai"}
        except Exception as e:
            return {"summary": _rule_based_summary(metrics), "model": settings.openai_model, "source": "rule-based-fallback", "error": str(e)}
    return {"summary": _rule_based_summary(metrics), "model": settings.openai_model, "source": "rule-based"}


def build_metrics(users: list[dict], progress: list[dict], subscriptions: list[dict], courses: list[dict], orders: list[dict]) -> dict[str, Any]:
    active = [s for s in subscriptions if s.get("status") == "active"]
    learners = {p.get("user_id") for p in progress}
    active_ids = {s.get("user_id") for s in active}
    churn_risk = len(learners - active_ids)

    category_counts: dict[str, int] = {}
    for c in courses:
        category_counts[c.get("category_name", "Unknown")] = category_counts.get(c.get("category_name", "Unknown"), 0) + 1
    top_category = max(category_counts, key=category_counts.get) if category_counts else "N/A"

    daily = _daily_totals(orders)
    recent_revenue = sum(daily[-30:]) if daily else 0

    return {
        "segment": "high-engagement office workers",
        "total_users": len(users),
        "active_subscriptions": len(active),
        "churn_risk_users": churn_risk,
        "top_category": top_category,
        "top_category_count": category_counts.get(top_category, 0),
        "total_revenue": round(sum(o.get("amount", 0) for o in orders), 2),
        "recent_30_day_revenue": round(recent_revenue, 2),
        "course_count": len(courses),
        "lesson_count": sum(len(c.get("syllabus", [])) for c in courses),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
