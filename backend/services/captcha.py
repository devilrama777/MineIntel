"""Short-lived server-side CAPTCHA challenges for the login flow."""
import base64
import hashlib
import io
import secrets
import string
import threading
import time
import uuid
from typing import Dict, Tuple

from PIL import Image, ImageDraw, ImageFont

CAPTCHA_LENGTH = 6
CAPTCHA_TTL_SECONDS = 180
CAPTCHA_ALPHABET = string.ascii_uppercase + string.digits

_lock = threading.Lock()
_challenges: Dict[str, Tuple[str, float]] = {}


def _secure_answer() -> str:
    letters = secrets.choice(string.ascii_uppercase)
    digit = secrets.choice(string.digits)
    remaining = "".join(secrets.choice(CAPTCHA_ALPHABET) for _ in range(CAPTCHA_LENGTH - 2))
    chars = list(letters + digit + remaining)
    for index in range(len(chars) - 1, 0, -1):
        swap_index = secrets.randbelow(index + 1)
        chars[index], chars[swap_index] = chars[swap_index], chars[index]
    return "".join(chars)


def _font(size: int):
    for candidate in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _render_png(answer: str) -> str:
    image = Image.new("RGB", (260, 82), (238, 244, 252))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 259, 81), outline=(47, 79, 115), width=2)
    for _ in range(9):
        x1, y1 = secrets.randbelow(260), secrets.randbelow(82)
        x2, y2 = secrets.randbelow(260), secrets.randbelow(82)
        color = (secrets.randbelow(100), secrets.randbelow(100), secrets.randbelow(100))
        draw.line((x1, y1, x2, y2), fill=color, width=1)
    font = _font(34)
    for index, char in enumerate(answer):
        x = 22 + index * 36 + secrets.randbelow(7) - 3
        y = 20 + secrets.randbelow(11) - 5
        draw.text((x, y), char, font=font, fill=(18, 42, 75))
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


def create_challenge() -> Dict[str, str | int]:
    """Creates a new challenge and invalidates the previously issued challenge."""
    answer = _secure_answer()
    challenge_id = uuid.uuid4().hex
    expires_at = time.time() + CAPTCHA_TTL_SECONDS
    answer_hash = hashlib.sha256(answer.encode("utf-8")).hexdigest()
    with _lock:
        _challenges.clear()
        _challenges[challenge_id] = (answer_hash, expires_at)
    return {"challenge_id": challenge_id, "image": _render_png(answer), "expires_in": CAPTCHA_TTL_SECONDS}


def verify_challenge(challenge_id: str, answer: str) -> bool:
    """Atomically verifies, consumes, and invalidates one challenge."""
    with _lock:
        record = _challenges.pop(challenge_id, None)
    if not record:
        return False
    answer_hash, expires_at = record
    if time.time() > expires_at:
        return False
    candidate_hash = hashlib.sha256(answer.strip().upper().encode("utf-8")).hexdigest()
    return secrets.compare_digest(candidate_hash, answer_hash)
