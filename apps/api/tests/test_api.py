from fastapi.testclient import TestClient

from app.main import app


def test_session_and_match_roundtrip():
    with TestClient(app) as client:
        _session_and_match(client)


def _session_and_match(client: TestClient) -> None:
    health = client.get("/health")
    assert health.status_code == 200
    denied = client.post("/v1/players", json={"name": "Nessuno"})
    assert denied.status_code == 401
    session = client.post("/v1/session", json={"name": "Coach", "email": "coach@example.test", "role": "coach"})
    assert session.status_code == 200
    token = session.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    player = client.post("/v1/players", headers=headers, json={
        "id": "p-test",
        "name": "Giulia Test",
        "sport": "padel",
        "hand": "right",
        "side": "left",
        "level": "intermediate",
        "partnerName": "",
        "playStyle": "doubles",
        "backhand": None,
        "ownerId": "local",
        "example": True,
    })
    assert player.status_code == 200
    assert player.json()["example"] is False
    match = client.post("/v1/matches", headers=headers, json={
        "id": "m-test",
        "sport": "padel",
        "date": "2026-11-27",
        "place": "Test",
        "format": "set",
        "score": "",
        "opponents": "",
        "partner": "",
        "videoUrl": "",
        "status": "draft",
        "ownerId": "local",
        "focusPlayerId": "p-test",
        "side": "left",
        "example": True,
        "source": "local_api",
        "durationSec": 0,
        "confidenceNote": "",
        "observation": {"court": False, "ball": False, "pose": False, "position": False},
        "unclassifiedSegments": [],
        "limitNote": "",
    })
    assert match.status_code == 200
    assert match.json()["example"] is False
    job = client.post("/v1/matches/m-test/analyze", headers=headers)
    assert job.status_code == 200
    state = client.get(f"/v1/jobs/{job.json()['jobId']}", headers=headers)
    assert state.json()["status"] == "error"
    assert "Video" in state.json()["error"]
