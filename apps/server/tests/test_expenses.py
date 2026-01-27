def test_expenses_requires_auth(client):
    """Test that expenses endpoint requires authentication"""
    response = client.get("/expenses/")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_expenses_by_category_requires_auth(client):
    """Test that category endpoint requires authentication"""
    response = client.get("/expenses/category/food")
    assert response.status_code == 401


def test_date_range_requires_auth(client):
    """Test that date range endpoint requires authentication"""
    response = client.get(
        "/expenses/date-range?start_date=2024-01-01T00:00:00&end_date=2024-12-31T23:59:59"
    )
    assert response.status_code == 401


def test_monthly_stats_requires_auth(client):
    """Test that monthly stats endpoint requires authentication"""
    response = client.get("/expenses/stats/monthly?month=12&year=2024")
    assert response.status_code == 401
