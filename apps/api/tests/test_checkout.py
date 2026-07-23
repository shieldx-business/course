from fastapi.testclient import TestClient
from app.main import app


def test_checkout_creates_subscription_in_test_mode():
    with TestClient(app) as client:
        signup = client.post("/api/v1/auth/signup", json={"email": "buyer@example.com", "password": "password", "name": "Buyer"})
        assert signup.status_code == 200
        token = signup.json()["access_token"]

        res = client.post("/api/v1/checkout/session", headers={"Authorization": f"Bearer {token}"}, json={"tier_id": "tier-1mo"})
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "test"
        assert "subscription_id" in data

        sub = client.get("/api/v1/subscriptions/me", headers={"Authorization": f"Bearer {token}"})
        assert sub.status_code == 200
        assert sub.json()["status"] == "active"


def test_checkout_with_coupon():
    with TestClient(app) as client:
        signup = client.post("/api/v1/auth/signup", json={"email": "coupon@example.com", "password": "password"})
        token = signup.json()["access_token"]

        res = client.post("/api/v1/checkout/session", headers={"Authorization": f"Bearer {token}"}, json={"tier_id": "tier-1mo", "coupon_code": "LAUNCH20"})
        assert res.status_code == 200
        assert res.json()["amount"] < 49


def test_orders_endpoint_lists_purchases():
    with TestClient(app) as client:
        signup = client.post("/api/v1/auth/signup", json={"email": "orders@example.com", "password": "password"})
        token = signup.json()["access_token"]

        client.post("/api/v1/checkout/session", headers={"Authorization": f"Bearer {token}"}, json={"tier_id": "tier-1mo"})
        res = client.get("/api/v1/subscriptions/orders", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()) == 1
