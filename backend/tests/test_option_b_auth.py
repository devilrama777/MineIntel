"""
Direct Option B Authentication & User Lifecycle Verification Suite
Tests all logic directly via FastAPI app endpoints and auth_store functions.
"""
import os
import unittest

# Ensure test credentials are active in environment matching test suite
from backend import config

TEST_OFFICER_ID = config.get_auth_officer_id() or "MOC-TEST-OFFICER-7890"
TEST_OFFICER_PW = config.get_auth_secret_password() or "TestEnclaveSecret2026!"

from backend.main import (
    app,
    auth_login,
    auth_create_user,
    auth_update_user_status,
    LoginRequest,
    CreateUserRequest,
    MasterUserActionRequest
)
from backend import auth_store
from fastapi import HTTPException

class TestOptionBAuthentication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Clear test user file if any
        if auth_store.USERS_FILE.exists():
            try:
                auth_store.USERS_FILE.unlink()
            except Exception:
                pass

    def test_01_master_login(self):
        """Test Master credentials authenticate and return Senior Operational Auditor role."""
        req = LoginRequest(officer_id=TEST_OFFICER_ID, password=TEST_OFFICER_PW)
        resp = auth_login(req)
        self.assertTrue(resp["authenticated"])
        self.assertEqual(resp["role"], "Senior Operational Auditor")
        self.assertTrue(resp["is_master"])
        self.assertIn("token", resp)

    def test_02_create_normal_user_unauthorized(self):
        """Test creating a normal user fails with invalid master credentials."""
        req = CreateUserRequest(
            master_officer_id=TEST_OFFICER_ID,
            master_password="WRONG_PASSWORD",
            officer_id="field_auditor_1",
            password="auditor_pass_123",
            display_name="Field Auditor One",
            role="Operational Auditor"
        )
        with self.assertRaises(HTTPException) as ctx:
            auth_create_user(req)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_03_create_normal_user_authorized(self):
        """Test creating a normal user succeeds with valid master credentials."""
        req = CreateUserRequest(
            master_officer_id=TEST_OFFICER_ID,
            master_password=TEST_OFFICER_PW,
            officer_id="field_auditor_1",
            password="auditor_pass_123",
            display_name="Field Auditor One",
            role="Operational Auditor"
        )
        resp = auth_create_user(req)
        self.assertTrue(resp["success"])
        self.assertEqual(resp["user"]["officer_id"], "field_auditor_1")
        self.assertEqual(resp["user"]["role"], "Operational Auditor")

    def test_04_normal_user_login(self):
        """Test newly created normal user logs in successfully via common auth_login endpoint."""
        req = LoginRequest(officer_id="field_auditor_1", password="auditor_pass_123")
        resp = auth_login(req)
        self.assertTrue(resp["authenticated"])
        self.assertEqual(resp["officer_id"], "field_auditor_1")
        self.assertEqual(resp["name"], "Field Auditor One")
        self.assertEqual(resp["role"], "Operational Auditor")
        self.assertFalse(resp["is_master"])
        self.assertIn("token", resp)

    def test_05_invalid_credentials_rejected(self):
        """Test login with wrong password for both master and normal user."""
        # Wrong master pass
        req1 = LoginRequest(officer_id=TEST_OFFICER_ID, password="WrongPassword!")
        with self.assertRaises(HTTPException) as ctx1:
            auth_login(req1)
        self.assertEqual(ctx1.exception.status_code, 401)

        # Wrong normal user pass
        req2 = LoginRequest(officer_id="field_auditor_1", password="WrongPassword!")
        with self.assertRaises(HTTPException) as ctx2:
            auth_login(req2)
        self.assertEqual(ctx2.exception.status_code, 401)

    def test_06_disable_user_and_verify_rejection(self):
        """Test Master can disable normal user and disabled user login is rejected."""
        # Disable user
        req_disable = MasterUserActionRequest(
            master_officer_id=TEST_OFFICER_ID,
            master_password=TEST_OFFICER_PW,
            target_officer_id="field_auditor_1",
            is_active=False
        )
        resp_disable = auth_update_user_status(req_disable)
        self.assertTrue(resp_disable["success"])

        # Attempt login with disabled account
        req_login = LoginRequest(officer_id="field_auditor_1", password="auditor_pass_123")
        with self.assertRaises(HTTPException) as ctx_login:
            auth_login(req_login)
        self.assertEqual(ctx_login.exception.status_code, 403)
        self.assertIn("disabled or revoked", ctx_login.exception.detail)

        # Re-enable user
        req_enable = MasterUserActionRequest(
            master_officer_id=TEST_OFFICER_ID,
            master_password=TEST_OFFICER_PW,
            target_officer_id="field_auditor_1",
            is_active=True
        )
        resp_enable = auth_update_user_status(req_enable)
        self.assertTrue(resp_enable["success"])

        # Confirm user can log in again
        resp_login_again = auth_login(req_login)
        self.assertTrue(resp_login_again["authenticated"])

    def test_07_cold_start_persistence(self):
        """Simulate serverless runtime cold start by clearing in-memory modules and reloading from storage."""
        import importlib
        from backend import auth_store as store_mod
        importlib.reload(store_mod)
        # Reload and verify created user persists
        reloaded_user = store_mod.get_user_by_id("field_auditor_1")
        self.assertIsNotNone(reloaded_user)
        self.assertEqual(reloaded_user["officer_id"], "field_auditor_1")
        self.assertTrue(reloaded_user["is_active"])

if __name__ == "__main__":
    unittest.main()
