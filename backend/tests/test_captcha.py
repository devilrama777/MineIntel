import re
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from backend import config
from backend.main import LoginRequest, auth_login
from backend.services import captcha as captcha_service


class TestCaptchaSecurity(unittest.TestCase):
    def issue(self, answer="AB12CD"):
        with patch.object(captcha_service, "_secure_answer", return_value=answer):
            return captcha_service.create_challenge(), answer

    def test_generation_contains_letters_and_numbers(self):
        answers = [captcha_service._secure_answer() for _ in range(25)]
        self.assertTrue(all(re.fullmatch(r"[A-Z0-9]{6}", value) for value in answers))
        self.assertTrue(any(re.search(r"[A-Z]", value) and re.search(r"[0-9]", value) for value in answers))

    def test_correct_answer_is_accepted_once(self):
        challenge, answer = self.issue()
        self.assertTrue(captcha_service.verify_challenge(challenge["challenge_id"], answer.lower()))
        self.assertFalse(captcha_service.verify_challenge(challenge["challenge_id"], answer))

    def test_wrong_missing_expired_and_refreshed_challenges_are_rejected(self):
        challenge, answer = self.issue()
        self.assertFalse(captcha_service.verify_challenge(challenge["challenge_id"], "WRONG1"))
        challenge, answer = self.issue()
        with patch.object(captcha_service.time, "time", return_value=challenge["expires_in"] + 10**10):
            self.assertFalse(captcha_service.verify_challenge(challenge["challenge_id"], answer))
        old, old_answer = self.issue()
        new, new_answer = self.issue("ZX98YU")
        self.assertFalse(captcha_service.verify_challenge(old["challenge_id"], old_answer))
        self.assertTrue(captcha_service.verify_challenge(new["challenge_id"], new_answer))

    def test_valid_captcha_and_credentials_login(self):
        challenge, answer = self.issue()
        response = auth_login(LoginRequest(
            officer_id=config.get_auth_officer_id() or "MOC-TEST-OFFICER-7890",
            password=config.get_auth_secret_password() or "TestEnclaveSecret2026!",
            captcha_challenge_id=challenge["challenge_id"],
            captcha_answer=answer,
        ))
        self.assertTrue(response["authenticated"])

    def test_invalid_captcha_is_rejected_before_credentials(self):
        challenge, _ = self.issue()
        with self.assertRaises(HTTPException) as ctx:
            auth_login(LoginRequest(
                officer_id=config.get_auth_officer_id() or "MOC-TEST-OFFICER-7890",
                password="definitely-wrong",
                captcha_challenge_id=challenge["challenge_id"],
                captcha_answer="WRONG1",
            ))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_valid_captcha_does_not_bypass_invalid_credentials(self):
        challenge, answer = self.issue()
        with self.assertRaises(HTTPException) as ctx:
            auth_login(LoginRequest(
                officer_id=config.get_auth_officer_id() or "MOC-TEST-OFFICER-7890",
                password="definitely-wrong",
                captcha_challenge_id=challenge["challenge_id"],
                captcha_answer=answer,
            ))
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
