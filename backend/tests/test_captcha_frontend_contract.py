from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
LOGIN_VIEW = (ROOT / "src/components/views/LoginView.tsx").read_text(encoding="utf-8")
AUTH_SERVICE = (ROOT / "src/services/authService.ts").read_text(encoding="utf-8")


class TestCaptchaFrontendContract(unittest.TestCase):
    def test_login_submits_current_challenge_and_entered_text(self):
        self.assertIn("captcha_challenge_id: captchaChallengeId", LOGIN_VIEW)
        self.assertIn("captcha_answer: captchaAnswer", LOGIN_VIEW)
        self.assertIn("setCaptchaChallengeId(challenge.challenge_id)", LOGIN_VIEW)

    def test_input_is_limited_to_six_and_fetch_is_uncached(self):
        self.assertIn("maxLength={6}", LOGIN_VIEW)
        self.assertIn("slice(0, 6)", LOGIN_VIEW)
        self.assertIn("cache: 'no-store'", AUTH_SERVICE)


if __name__ == "__main__":
    unittest.main()
