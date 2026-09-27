"""
Test L3 & L4 Data Persistence and End-to-End Pipeline Verification
"""
import io
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, Document, init_db

client = TestClient(app)

def test_l3_data_source_persistence():
    """
    Task 1 Verification:
    Upload a file -> verify saved in SQLite Document table -> verify GET /api/ingest/data-sources retrieves it.
    """
    init_db()
    
    # 1. Upload a file to /api/ingest/upload
    fake_csv = b"Colliery,Production,Dispatch\nAmritnagar,12.5,11.8\nKalyanpur,8.4,8.1\n"
    files = {"file": ("test_audit_colliery.csv", io.BytesIO(fake_csv), "text/csv")}
    upload_res = client.post("/api/ingest/upload", files=files)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data.get("success") is True
    file_id = upload_data.get("file_id")
    assert file_id is not None
    
    # 2. Verify directly in SQLite database via SQLAlchemy
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == file_id).first()
        assert doc is not None, f"Document {file_id} was not persisted into SQLite DB."
        assert doc.filename == "test_audit_colliery.csv"
        assert doc.file_size == len(fake_csv)
    finally:
        db.close()
        
    # 3. Verify via GET /api/ingest/data-sources
    sources_res = client.get("/api/ingest/data-sources")
    assert sources_res.status_code == 200
    sources_data = sources_res.json()
    docs = sources_data.get("documents") or sources_data.get("data_sources") or []
    found = any(d["id"] == file_id for d in docs)
    assert found is True, f"File {file_id} not found in /api/ingest/data-sources"
    print(f"L3 TEST PASSED: File {file_id} persisted in SQLite and retrieved via /api/ingest/data-sources")
    return file_id


def test_l4_generation_to_preview_and_export():
    """
    Task 2 & 3 Verification:
    - POST /api/generate-report with file_ids -> returns report_id
    - GET /api/reports/{report_id} -> returns content
    - POST /api/reports/export-markdown-pdf -> compiles & streams PDF
    """
    # 1. Ensure at least one file exists
    file_id = test_l3_data_source_persistence()
    
    # 2. Trigger POST /api/generate-report with file_ids
    gen_payload = {
        "file_ids": [file_id],
        "fileIds": [file_id],
        "reportType": "executive",
        "depth": "standard",
        "tone": "analytical",
        "fileName": "Test Colliery Verification Report"
    }
    gen_res = client.post("/api/generate-report", json=gen_payload)
    assert gen_res.status_code == 200, f"Report generation failed: {gen_res.text}"
    gen_data = gen_res.json()
    report_id = gen_data.get("report_id") or gen_data.get("job_id")
    assert report_id is not None, "report_id missing in /api/generate-report response"
    markdown = gen_data.get("reportMarkdown") or gen_data.get("content")
    assert markdown is not None and len(markdown) > 0
    print(f"L4 GENERATION PASSED: Received report_id: {report_id}")
    
    # 3. Fetch report content via GET /api/reports/{report_id} (used by Preview page)
    rep_res = client.get(f"/api/reports/{report_id}")
    assert rep_res.status_code == 200, f"Fetch report {report_id} failed: {rep_res.text}"
    rep_data = rep_res.json()
    assert (rep_data.get("reportMarkdown") or rep_data.get("raw_markdown") or rep_data.get("final_report")) is not None
    print(f"L4 PREVIEW PASSED: Fetched content for {report_id}")
    
    # 4. Final Export via POST /api/reports/export-markdown-pdf
    export_payload = {
        "report_id": report_id,
        "job_id": gen_data.get("job_id"),
        "markdown_content": markdown,
        "document_title": "Test_Colliery_Verification_Report",
        "template_name": "aurora_gradient"
    }
    exp_res = client.post("/api/reports/export-markdown-pdf", json=export_payload)
    assert exp_res.status_code == 200, f"Export PDF failed: {exp_res.text}"
    assert exp_res.headers.get("content-type") == "application/pdf"
    assert len(exp_res.content) > 100, "Exported PDF is too small or empty"
    print(f"L4 EXPORT PASSED: Exported PDF received {len(exp_res.content)} bytes.")

if __name__ == "__main__":
    test_l3_data_source_persistence()
    test_l4_generation_to_preview_and_export()
    print("ALL L3 & L4 TESTS COMPLETED SUCCESSFULLY!")
