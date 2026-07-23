from fastapi.testclient import TestClient
from app.main import app


def test_stream_token_requires_auth():
    with TestClient(app) as client:
        res = client.post("/api/v1/lessons/lesson-1/stream-token")
        assert res.status_code == 401


def test_admin_can_create_stream_token_and_stream():
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"email": "admin@ascendly.io", "password": "password"})
        assert login.status_code == 200
        token = login.json()["access_token"]

        res = client.post("/api/v1/lessons/lesson-1/stream-token", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["stream_url"].startswith("/stream/")

        stream = client.get(f"/api/v1{data['stream_url']}")
        assert stream.status_code in (200, 206)


def test_invalid_stream_token_returns_403():
    with TestClient(app) as client:
        res = client.get("/api/v1/stream/invalid-token")
        assert res.status_code == 403
