import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.routers.auth import create_session_token

client = TestClient(app)

def test_autonomous_workflow():
    token = create_session_token("OFFICER-TEST", "officer")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test unauthenticated request to protected endpoint returns 401
    unauth_resp = client.post("/api/generate-report", json={"reportType": "executive"})
    assert unauth_resp.status_code == 401, f"Expected 401, got {unauth_resp.status_code}"

    # 2. Test authenticated background report initiation returns job_id and status: RUNNING
    auth_resp = client.post(
        "/api/generate-report",
        json={"reportType": "executive", "fileName": "Test Executive Report"},
        headers=headers
    )
    assert auth_resp.status_code == 200, f"Expected 200, got {auth_resp.status_code}: {auth_resp.text}"
    data = auth_resp.json()
    assert data.get("success") is True, f"Expected success True: {data}"
    assert "job_id" in data, f"Expected job_id in data: {data}"
    assert data.get("status") == "RUNNING", f"Expected RUNNING status: {data}"
    job_id = data["job_id"]

    # 3. Test agent status check returns the initialized state
    task_resp = client.get(f"/api/agent/tasks/{job_id}", headers=headers)
    assert task_resp.status_code == 200, f"Expected 200, got {task_resp.status_code}: {task_resp.text}"
    task_data = task_resp.json()
    assert task_data.get("task_id") == job_id, f"Task ID mismatch: {task_data}"
    assert task_data.get("status") in ["PENDING", "RUNNING", "COMPLETED", "FAILED"]

    # 4. Verify single canonical upload route exists and legacy /api/upload is gone (404)
    legacy_upload = client.post("/api/upload", headers=headers)
    assert legacy_upload.status_code == 404, f"Expected 404 for legacy upload, got {legacy_upload.status_code}"

    # 5. Verify single canonical upload route accepts files
    files = {"file": ("test.txt", b"Test Evidence File Content", "text/plain")}
    canonical_upload = client.post("/api/ingest/upload", files=files, headers=headers)
    assert canonical_upload.status_code == 200, f"Expected 200 for canonical upload, got {canonical_upload.status_code}: {canonical_upload.text}"
    upload_data = canonical_upload.json()
    assert upload_data.get("status") in ["queued", "processing", "completed"] or upload_data.get("success") is True
