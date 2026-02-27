def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}


def test_telegram_auth_missing_data(client):
    """Test Telegram auth with missing data"""
    response = client.post("/auth/telegram", json={})
    assert response.status_code == 422  # Validation error
