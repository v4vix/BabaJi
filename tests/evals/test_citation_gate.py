import pytest
from fastapi.testclient import TestClient

from services.api.app.main import app, settings


client = TestClient(app)


@pytest.fixture(autouse=True)
def _enable_insecure_demo_auth() -> None:
    original = settings.allow_insecure_demo_auth
    settings.allow_insecure_demo_auth = True
    try:
        yield
    finally:
        settings.allow_insecure_demo_auth = original


def test_kundli_response_has_mode() -> None:
    response = client.post(
        "/v1/kundli/report",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "birth": {
                "date": "1990-01-01",
                "time": "10:00",
                "timezone": "Asia/Kolkata",
                "location": "Mumbai",
                "latitude": 19.076,
                "longitude": 72.8777,
            },
            "question": "dasha tendencies",
        },
    )
    assert response.status_code == 200
    assert response.json()["mode"] in {"cortex-grounded", "general-guidance"}
