"""Short-lived server-side CAPTCHA challenges for the login flow."""
import base64
import hashlib
import io
import secrets
import string
import threading
import time
import uuid
from typing import Dict, Optional, Tuple

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
    for _ in range(7):
        x1, y1 = secrets.randbelow(260), secrets.randbelow(82)
        x2, y2 = secrets.randbelow(260), secrets.randbelow(82)
        color = (secrets.randbelow(120), secrets.randbelow(120), secrets.randbelow(120))
        draw.line((x1, y1, x2, y2), fill=color, width=1)
    for _ in range(42):
        x, y = secrets.randbelow(256), secrets.randbelow(78)
        draw.ellipse((x, y, x + 1, y + 1), fill=(130, 145, 165))

    font = _font(43)
    colors = ((20, 83, 150), (180, 54, 65), (20, 125, 92), (116, 67, 155), (190, 104, 25), (35, 105, 125))
    for index, char in enumerate(answer):
        layer = Image.new("RGBA", (58, 66), (255, 255, 255, 0))
        layer_draw = ImageDraw.Draw(layer)
        layer_draw.text((8, 5), char, font=font, fill=colors[index], stroke_width=1, stroke_fill=(255, 255, 255, 220))
        angle = secrets.randbelow(17) - 8
        layer = layer.rotate(angle, resample=Image.Resampling.BICUBIC, expand=1)
        x = 5 + index * 42 + secrets.randbelow(7) - 3
        y = 8 + secrets.randbelow(9) - 4
        image.paste(layer, (x, y), layer)
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


def _pg_save_challenge(challenge_id: str, answer_hash: str, expires_at: float) -> None:
    try:
        from backend import config
        if config.get_database_url():
            from backend.auth_store import _get_pg_connection
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS mineintel_captcha_challenges (
                            challenge_id VARCHAR(64) PRIMARY KEY,
                            answer_hash VARCHAR(64) NOT NULL,
                            expires_at DOUBLE PRECISION NOT NULL,
                            used BOOLEAN NOT NULL DEFAULT FALSE
                        );
                        UPDATE mineintel_captcha_challenges SET used = TRUE WHERE used = FALSE;
                        INSERT INTO mineintel_captcha_challenges (challenge_id, answer_hash, expires_at, used)
                        VALUES (%s, %s, %s, FALSE);
                    """, (challenge_id, answer_hash, expires_at))
                conn.commit()
    except Exception:
        pass


def _pg_verify_challenge(challenge_id: str, answer: str) -> Optional[bool]:
    try:
        from backend import config
        if config.get_database_url():
            from backend.auth_store import _get_pg_connection
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT answer_hash, expires_at, used 
                        FROM mineintel_captcha_challenges 
                        WHERE challenge_id = %s
                    """, (challenge_id,))
                    row = cur.fetchone()
                    if not row:
                        return None
                    answer_hash, expires_at, used = row
                    if used or time.time() > expires_at:
                        return False
                    cur.execute("UPDATE mineintel_captcha_challenges SET used = TRUE WHERE challenge_id = %s", (challenge_id,))
                    conn.commit()
                    candidate_hash = hashlib.sha256(answer.strip().upper().encode("utf-8")).hexdigest()
                    return secrets.compare_digest(candidate_hash, answer_hash)
    except Exception:
        pass
    return None


def create_challenge() -> Dict[str, str | int]:
    """Creates a new challenge and invalidates the previously issued challenge."""
    answer = _secure_answer()
    challenge_id = uuid.uuid4().hex
    expires_at = time.time() + CAPTCHA_TTL_SECONDS
    answer_hash = hashlib.sha256(answer.encode("utf-8")).hexdigest()
    with _lock:
        _challenges.clear()
        _challenges[challenge_id] = (answer_hash, expires_at)
    _pg_save_challenge(challenge_id, answer_hash, expires_at)
    return {"challenge_id": challenge_id, "image": _render_png(answer), "expires_in": CAPTCHA_TTL_SECONDS}


def verify_challenge(challenge_id: str, answer: str) -> bool:
    """Atomically verifies, consumes, and invalidates one challenge."""
    pg_res = _pg_verify_challenge(challenge_id, answer)
    if pg_res is not None:
        with _lock:
            _challenges.pop(challenge_id, None)
        return pg_res
    with _lock:
        record = _challenges.pop(challenge_id, None)
    if not record:
        return False
    answer_hash, expires_at = record
    if time.time() > expires_at:
        return False
    candidate_hash = hashlib.sha256(answer.strip().upper().encode("utf-8")).hexdigest()
    return secrets.compare_digest(candidate_hash, answer_hash)
