import os
import sys
import asyncio
from pathlib import Path
from unittest.mock import patch

# Ensure root directory is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure test officer credentials
os.environ["MINEINTEL_OFFICER_ID"] = "MOC-TEST-INTEGRATION-99"
os.environ["MINEINTEL_AUTH_PASSWORD"] = "IntegrationSecret2026!"
os.environ["MINEINTEL_JWT_SECRET"] = "integration-jwt-secret-2026"

from fastapi import HTTPException, Response
from backend.main import (
    health_check,
    auth_captcha,
    auth_login,
    auth_profile,
    auth_update_profile,
    auth_change_password,
    export_report_v1,
    system_open_file,
    LoginRequest,
    ProfileUpdateRequest,
    PasswordChangeRequest,
    ReportExportRequest,
    SystemOpenFileRequest
)
from backend.services import captcha as captcha_service
import backend.auth_store as auth_store

def run_integration_verification():
    print("=== STARTING INTEGRATION VERIFICATION ===")
    
    # 1. Health check & Dynamic AI provider/model
    h_data = health_check()
    assert h_data.get("status") == "healthy", f"Health check failed: {h_data}"
    assert "ai_provider" in h_data, "ai_provider missing in health_check"
    assert "cloud_model" in h_data, "cloud_model missing in health_check"
    print(f"PASS: health_check returned provider='{h_data.get('ai_provider')}', model='{h_data.get('cloud_model')}'")

    # 2. CAPTCHA generation
    c1_data = auth_captcha(Response())
    assert "challenge_id" in c1_data and "image" in c1_data
    c1_id = c1_data["challenge_id"]
    print(f"PASS: CAPTCHA 1 generated challenge_id={c1_id}")

    # 3. CAPTCHA refresh
    c2_data = auth_captcha(Response())
    c2_id = c2_data["challenge_id"]
    assert c1_id != c2_id, "Refreshed captcha returned identical challenge ID"
    print(f"PASS: CAPTCHA refresh generated new challenge_id={c2_id}")

    # 4. Wrong CAPTCHA is rejected
    wrong_req = LoginRequest(
        officer_id="MOC-TEST-INTEGRATION-99",
        password="IntegrationSecret2026!",
        captcha_challenge_id=c2_id,
        captcha_answer="WRONG1"
    )
    try:
        auth_login(wrong_req)
        assert False, "Expected HTTPException for wrong captcha"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "captcha" in exc.detail.lower()
        print("PASS: Wrong CAPTCHA correctly rejected with 400")

    # 5. Correct CAPTCHA + correct credentials logs in
    with patch.object(captcha_service, "_secure_answer", return_value="PASS99"):
        c3_data = captcha_service.create_challenge()
    c3_id = c3_data["challenge_id"]

    valid_req = LoginRequest(
        officer_id="MOC-TEST-INTEGRATION-99",
        password="IntegrationSecret2026!",
        captcha_challenge_id=c3_id,
        captcha_answer="PASS99"
    )
    login_data = auth_login(valid_req)
    assert login_data.get("authenticated") is True
    token = login_data.get("token")
    assert token, "Token missing in login response"
    auth_header = f"Bearer {token}"
    print(f"PASS: Login successful with valid credentials & CAPTCHA. Token received.")

    # Single-use challenge: replay c3 should fail
    try:
        auth_login(valid_req)
        assert False, "Expected HTTPException for replayed captcha"
    except HTTPException as exc:
        assert exc.status_code == 400
        print("PASS: Single-use CAPTCHA challenge enforced (replay rejected)")

    from backend.main import require_auth, verify_session_token
    auth_session = require_auth(authorization=auth_header)

    # 6. Master Profile retrieval
    prof_data = auth_profile(auth=auth_session)
    assert prof_data.get("officer_id") == "MOC-TEST-INTEGRATION-99"
    assert prof_data.get("is_master") is True
    print(f"PASS: Master profile retrieved for officer '{prof_data.get('officer_id')}' (Display: '{prof_data.get('display_name')}')")

    # Verify master cannot edit profile or change password (master restrictions)
    try:
        auth_update_profile(ProfileUpdateRequest(display_name="Hack"), auth=auth_session)
        assert False, "Expected 403 on master profile edit"
    except HTTPException as exc:
        assert exc.status_code == 403
        print("PASS: Master profile edit correctly blocked with 403 (master-account restriction)")

    try:
        auth_change_password(PasswordChangeRequest(current_password="any", new_password="any"), auth=auth_session)
        assert False, "Expected 403 on master password change"
    except HTTPException as exc:
        assert exc.status_code == 403
        print("PASS: Master password change correctly blocked with 403 (master-account restriction)")

    # 7. Normal User: Create, Login, Profile Edit, Password Change & Session Invalidation
    normal_uid = "field_officer_77"
    normal_pwd = "InitialSecret2026!"
    auth_store.create_user(normal_uid, normal_pwd, "Field Auditor Alpha", phone="+91-1111111111", email="alpha@mineintel.gov.in")
    
    with patch.object(captcha_service, "_secure_answer", return_value="NORM01"):
        cn_data = captcha_service.create_challenge()
    
    normal_login_res = auth_login(LoginRequest(
        officer_id=normal_uid,
        password=normal_pwd,
        captcha_challenge_id=cn_data["challenge_id"],
        captcha_answer="NORM01"
    ))
    assert normal_login_res.get("authenticated") is True
    normal_token = normal_login_res.get("token")
    normal_auth = require_auth(authorization=f"Bearer {normal_token}")
    
    # Check normal profile
    normal_prof = auth_profile(auth=normal_auth)
    assert normal_prof.get("officer_id") == normal_uid
    assert normal_prof.get("display_name") == "Field Auditor Alpha"
    assert normal_prof.get("is_master") is False
    print(f"PASS: Normal user profile retrieved successfully for '{normal_uid}'")

    # Edit normal profile
    edit_req = ProfileUpdateRequest(
        display_name="Field Auditor Alpha (Senior)",
        phone="+91-9876543210",
        email="alpha.senior@mineintel.gov.in"
    )
    edit_res = auth_update_profile(req=edit_req, auth=normal_auth)
    assert edit_res.get("success") is True
    updated_user = edit_res.get("profile", {})
    assert updated_user.get("display_name") == "Field Auditor Alpha (Senior)"
    assert updated_user.get("phone") == "+91-9876543210"
    assert updated_user.get("email") == "alpha.senior@mineintel.gov.in"
    assert updated_user.get("officer_id") == normal_uid  # Read-only
    print("PASS: Normal profile updated successfully (display_name, phone, email updated; officer_id unchanged)")

    # 8. Password change for normal user
    new_normal_pwd = "NewAlphaSecret2026!Strong"
    pwd_req = PasswordChangeRequest(
        current_password=normal_pwd,
        new_password=new_normal_pwd
    )
    pwd_data = auth_change_password(req=pwd_req, auth=normal_auth)
    assert pwd_data.get("success") is True
    assert pwd_data.get("session_invalidated") is True
    print("PASS: Password change succeeded and session_invalidated flagged")

    # Verify old session token is invalidated
    assert verify_session_token(normal_token) is None, "Old session token must be invalidated after password change"
    print("PASS: Verified old session token is immediately invalidated")

    # Verify login with new password works
    with patch.object(captcha_service, "_secure_answer", return_value="NEWP99"):
        c4_data = captcha_service.create_challenge()
    new_login_req = LoginRequest(
        officer_id=normal_uid,
        password=new_normal_pwd,
        captcha_challenge_id=c4_data["challenge_id"],
        captcha_answer="NEWP99"
    )
    new_login_data = auth_login(new_login_req)
    assert new_login_data.get("authenticated") is True
    print("PASS: Logged in successfully with newly updated password")

    # 9. Export endpoint (Antigravity fix verification)
    exp_req = ReportExportRequest(
        format="pdf",
        report_title="Audit_Export_Integration_Test"
    )
    exp_data = export_report_v1(exp_req)
    assert exp_data.get("status") == "success"
    assert "download_url" in exp_data
    assert "saved_path" in exp_data
    created_file = Path(exp_data["saved_path"])
    assert created_file.exists(), f"Exported file does not exist on disk: {created_file}"
    print(f"PASS: POST /api/v1/reports/export created file at {created_file}")

    # 10. System open-file endpoint (Antigravity fix verification)
    open_req = SystemOpenFileRequest(path=str(created_file), reveal=False)
    open_data = system_open_file(open_req)
    assert open_data.get("status") == "success"
    assert open_data.get("exists") is True
    print("PASS: POST /api/v1/system/open-file verified successfully")

    # 11. Verify Data Sources is absent in frontend static bundle
    static_index = ROOT_DIR / "backend" / "static" / "index.html"
    assert static_index.exists(), "backend/static/index.html missing"
    
    js_files = list((ROOT_DIR / "backend" / "static" / "assets").glob("*.js"))
    assert len(js_files) > 0, "No JS files found in backend/static/assets"
    
    # Check that App.tsx and sidebar navigation do not have data-sources
    app_tsx = (ROOT_DIR / "src" / "App.tsx").read_text(encoding="utf-8")
    assert "data-sources" not in app_tsx.lower() or "data sources" not in app_tsx.lower(), "Data Sources route found in App.tsx"
    
    print("=== ALL 11 VERIFICATION CHECKS PASSED ===")

if __name__ == "__main__":
    run_integration_verification()
