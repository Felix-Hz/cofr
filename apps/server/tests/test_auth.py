from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}


def test_telegram_auth_missing_data():
    """Test Telegram auth with missing data"""
    response = client.post("/auth/telegram", json={})
    assert response.status_code == 422  # Validation error
