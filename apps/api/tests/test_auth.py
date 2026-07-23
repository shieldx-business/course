from fastapi.testclient import TestClient
from app.main import app


def _signup(client, email="test@example.com", password="password123"):
    return client.post("/api/v1/auth/signup", json={"email": email, "password": password, "name": "Tester"})


def test_signup_and_login():
    with TestClient(app) as client:
        res = _signup(client)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

        login = client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert login.status_code == 200
        assert "access_token" in login.json()


def test_login_invalid_credentials():
    with TestClient(app) as client:
        _signup(client)
        res = client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "wrong"})
        assert res.status_code == 401


def test_profile_update():
    with TestClient(app) as client:
        signup = _signup(client)
        token = signup.json()["access_token"]
        res = client.put("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}, json={"name": "Updated"})
        assert res.status_code == 200
        assert res.json()["name"] == "Updated"


def test_password_change():
    with TestClient(app) as client:
        _signup(client, "change@example.com", "oldpass")
        signup = client.post("/api/v1/auth/login", json={"email": "change@example.com", "password": "oldpass"})
        token = signup.json()["access_token"]
        res = client.put("/api/v1/auth/me/password", headers={"Authorization": f"Bearer {token}"}, json={"old_password": "oldpass", "new_password": "newpass"})
        assert res.status_code == 200

        login = client.post("/api/v1/auth/login", json={"email": "change@example.com", "password": "newpass"})
        assert login.status_code == 200


def test_refresh_token_rotation():
    with TestClient(app) as client:
        signup = _signup(client)
        refresh = signup.json()["refresh_token"]

        res = client.post("/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={refresh}"})
        assert res.status_code == 200
        new_refresh = res.json()["refresh_token"]
        assert new_refresh != refresh

        res2 = client.post("/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={refresh}"})
        assert res2.status_code == 401
