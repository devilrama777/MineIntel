"""Short-lived server-side CAPTCHA challenges for the login flow."""
import base64
import hashlib
import io
import secrets
import string
import threading
import time
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont

CAPTCHA_LENGTH = 6
CAPTCHA_TTL_SECONDS = 180
CAPTCHA_ALPHABET = string.ascii_uppercase + string.digits
CAPTCHA_FONT_PATH = Path(__file__).resolve().parents[1] / "assets" / "DejaVuSans-Bold.ttf"

_lock = threading.Lock()
_challenges: Dict[str, Tuple[str, float]] = {}
_consumed_challenges: set[str] = set()


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
    if not CAPTCHA_FONT_PATH.is_file():
        raise FileNotFoundError(f"Bundled CAPTCHA font is missing: {CAPTCHA_FONT_PATH}")
    return ImageFont.truetype(str(CAPTCHA_FONT_PATH), size)


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

    font = _font(56)
    colors = ((20, 83, 150), (180, 54, 65), (20, 125, 92), (116, 67, 155), (190, 104, 25), (35, 105, 125))
    glyphs = []
    for index, char in enumerate(answer):
        layer = Image.new("RGBA", (64, 78), (255, 255, 255, 0))
        layer_draw = ImageDraw.Draw(layer)
        bounds = layer_draw.textbbox((0, 0), char, font=font, stroke_width=1)
        text_width = bounds[2] - bounds[0]
        text_height = bounds[3] - bounds[1]
        text_x = (layer.width - text_width) // 2 - bounds[0]
        text_y = (layer.height - text_height) // 2 - bounds[1] - 2
        layer_draw.text((text_x, text_y), char, font=font, fill=colors[index], stroke_width=1, stroke_fill=(255, 255, 255, 220))
        angle = secrets.randbelow(17) - 8
        glyphs.append(layer.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True))

    gap = 2
    available_width = image.width - 8
    total_width = sum(glyph.width for glyph in glyphs) + gap * (len(glyphs) - 1)
    if total_width > available_width:
        scale = available_width / total_width
        glyphs = [glyph.resize((max(1, int(glyph.width * scale)), max(1, int(glyph.height * scale))), Image.Resampling.LANCZOS) for glyph in glyphs]
        total_width = sum(glyph.width for glyph in glyphs) + gap * (len(glyphs) - 1)

    x = (image.width - total_width) // 2
    for index, glyph in enumerate(glyphs):
        y = max(0, min(image.height - glyph.height, (image.height - glyph.height) // 2 + secrets.randbelow(5) - 2))
        image.paste(glyph, (x, y), glyph)
        x += glyph.width + gap
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
    import hmac
    from backend import config
    answer = _secure_answer()
    expires_at = int(time.time() + CAPTCHA_TTL_SECONDS)
    answer_hash = hashlib.sha256(answer.encode("utf-8")).hexdigest()
    salt = secrets.token_hex(4)
    raw_payload = f"{salt}:{answer_hash}:{expires_at}"
    sig = hmac.new(config.JWT_SECRET.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
    challenge_id = f"cap_{salt}_{answer_hash[:16]}_{expires_at}_{sig}"
    with _lock:
        for cid in list(_challenges.keys()):
            _consumed_challenges.add(cid)
        _challenges.clear()
        _challenges[challenge_id] = (answer_hash, float(expires_at))
    _pg_save_challenge(challenge_id, answer_hash, float(expires_at))
    return {"challenge_id": challenge_id, "image": _render_png(answer), "expires_in": CAPTCHA_TTL_SECONDS}


def verify_challenge(challenge_id: str, answer: str) -> bool:
    """Atomically verifies, consumes, and invalidates one challenge."""
    if not challenge_id or not answer:
        return False
    clean_ans = answer.strip().upper()
    if len(clean_ans) != CAPTCHA_LENGTH:
        return False

    with _lock:
        if challenge_id in _consumed_challenges:
            return False

    pg_res = _pg_verify_challenge(challenge_id, clean_ans)
    if pg_res is not None:
        with _lock:
            _consumed_challenges.add(challenge_id)
            _challenges.pop(challenge_id, None)
        return pg_res

    with _lock:
        record = _challenges.pop(challenge_id, None)
    if record:
        with _lock:
            _consumed_challenges.add(challenge_id)
        answer_hash, expires_at = record
        if time.time() > expires_at:
            return False
        candidate_hash = hashlib.sha256(clean_ans.encode("utf-8")).hexdigest()
        return secrets.compare_digest(candidate_hash, answer_hash)

    # Stateless fallback for multi-instance serverless environments (e.g. Vercel lambdas)
    try:
        if challenge_id.startswith("cap_"):
            parts = challenge_id.split("_")
            if len(parts) == 5:
                import hmac
                from backend import config
                _, salt, hash_prefix, expires_str, sig = parts
                expires_at = int(expires_str)
                if time.time() > expires_at:
                    return False
                candidate_hash = hashlib.sha256(clean_ans.encode("utf-8")).hexdigest()
                if not secrets.compare_digest(candidate_hash[:16], hash_prefix):
                    return False
                raw_payload = f"{salt}:{candidate_hash}:{expires_at}"
                expected_sig = hmac.new(config.JWT_SECRET.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
                if secrets.compare_digest(sig, expected_sig):
                    with _lock:
                        _consumed_challenges.add(challenge_id)
                    return True
    except Exception:
        pass

    return False
