import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from backend import auth_store
from backend.main import (
    PasswordChangeRequest,
    ProfileUpdateRequest,
    auth_change_password,
    auth_profile,
    auth_update_profile,
    create_session_token,
    verify_session_token,
)


class TestProfileAccount(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.original_file = auth_store.USERS_FILE
        auth_store.USERS_FILE = Path(self.temp.name) / "users.json"
        self.user_id = "profile_test_user"
        auth_store.create_user(self.user_id, "OriginalPass123!", "Original Name", phone="111", email="old@example.com")
        self.token = create_session_token(self.user_id, "Worker")
        self.auth = verify_session_token(self.token)
        self.assertIsNotNone(self.auth)

    def tearDown(self):
        auth_store.USERS_FILE = self.original_file
        self.temp.cleanup()

    def test_profile_edit_and_officer_id_immutability(self):
        profile = auth_profile(self.auth)
        self.assertEqual(profile["officer_id"], self.user_id)
        updated = auth_update_profile(ProfileUpdateRequest(display_name="Updated Name", phone="222", email="new@example.com"), self.auth)
        self.assertEqual(updated["profile"]["display_name"], "Updated Name")
        stored = auth_store.get_user_by_id(self.user_id)
        self.assertEqual(stored["officer_id"], self.user_id)
        self.assertEqual(stored["phone"], "222")
        self.assertEqual(stored["email"], "new@example.com")

    def test_password_change_requires_current_password_and_invalidates_session(self):
        with self.assertRaises(Exception):
            auth_change_password(PasswordChangeRequest(current_password="wrong", new_password="NewSecurePass456!"), self.auth)
        result = auth_change_password(PasswordChangeRequest(current_password="OriginalPass123!", new_password="NewSecurePass456!"), self.auth)
        self.assertTrue(result["session_invalidated"])
        self.assertIsNone(verify_session_token(self.token))
        stored = auth_store.get_user_by_id(self.user_id)
        self.assertNotEqual(stored["password_hash"], "NewSecurePass456!")
        self.assertTrue(auth_store.authenticate_user(self.user_id, "NewSecurePass456!"))


if __name__ == "__main__":
    unittest.main()
