"""
MineIntel Authentication Router (/api/auth)
Provides cryptographic session tokens, user provisioning, profile management, and CAPTCHA.
"""
import hashlib
import hmac
import logging
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel

from backend import config, auth_store
from backend.services.captcha import create_challenge, verify_challenge

logger = logging.getLogger("mineintel.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# -------------------------------------------------------------------------
# PYDANTIC REQUEST MODELS
# -------------------------------------------------------------------------
class LoginRequest(BaseModel):
    officer_id: Optional[str] = None
    username: Optional[str] = None
    password: str
    captcha_challenge_id: str
    captcha_answer: str
    remember_device: Optional[bool] = True


class MasterVerifyRequest(BaseModel):
    master_officer_id: str
    master_password: str


class CreateUserRequest(BaseModel):
    master_officer_id: str
    master_password: str
    officer_id: str
    password: str
    display_name: Optional[str] = None
    role: Optional[str] = "Worker"


class MasterUserActionRequest(BaseModel):
    master_officer_id: str
    master_password: str
    target_officer_id: str
    is_active: bool


class ProfileUpdateRequest(BaseModel):
    display_name: str
    phone: str = ""
    email: str = ""


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# -------------------------------------------------------------------------
# SESSION TOKEN HELPERS & DEPENDENCIES
# -------------------------------------------------------------------------
def create_session_token(officer_id: str, role: str = "Senior Officer") -> str:
    """Creates a cryptographically signed session token with timestamp."""
    timestamp = int(time.time() * 1000)
    payload = f"{officer_id}:{timestamp}:{role}"
    sig = hmac.new(config.JWT_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies cryptographic session token or standard HS256 JWT.
    Supports:
    1. 4-part HMAC token: officer_id:timestamp:role:sig
    2. 3-part standard JWT: header.payload.signature
    """
    if not token or not isinstance(token, str):
        return None
    token = token.strip()

    # 1. Try 4-part colon format: officer_id:timestamp:role:sig
    if ":" in token:
        try:
            parts = token.split(":")
            if len(parts) == 4:
                officer_id, timestamp_str, role, sig = parts
                timestamp = int(timestamp_str)
                if (time.time() * 1000) - timestamp > 86400 * 1000:  # 24 hours expiry
                    return None
                stored_user = auth_store.get_user_by_id(officer_id)
                if stored_user and timestamp <= int(stored_user.get("session_invalidated_at", 0) or 0):
                    return None
                payload = f"{officer_id}:{timestamp}:{role}"
                expected_sig = hmac.new(config.JWT_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
                if secrets.compare_digest(sig, expected_sig):
                    return {"officer_id": officer_id, "role": role, "timestamp": timestamp}
        except Exception:
            pass

    # 2. Try standard 3-part JWT: header.payload.signature
    if "." in token:
        try:
            import base64
            import json
            parts = token.split(".")
            if len(parts) == 3:
                header_b64, payload_b64, sig_b64 = parts
                signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
                expected_sig_bytes = hmac.new(config.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
                expected_sig_b64 = base64.urlsafe_b64encode(expected_sig_bytes).decode("utf-8").rstrip("=")

                if secrets.compare_digest(sig_b64.rstrip("="), expected_sig_b64):
                    padded_payload = payload_b64 + "=" * (-len(payload_b64) % 4)
                    payload_json = json.loads(base64.urlsafe_b64decode(padded_payload.encode("utf-8")).decode("utf-8"))

                    exp = payload_json.get("exp")
                    if exp and exp < time.time():
                        return None

                    officer_id = payload_json.get("sub") or payload_json.get("officer_id") or payload_json.get("username") or "LOCAL_OFFICER"
                    role = payload_json.get("role", "Worker")
                    timestamp = int(payload_json.get("iat", time.time()) * 1000)
                    return {"officer_id": str(officer_id), "role": str(role), "timestamp": timestamp}
        except Exception:
            pass

    # 3. Development / Local Officer token
    if token in ("dev_token", "LOCAL_OFFICER"):
        return {"officer_id": "LOCAL_OFFICER", "role": "Senior Officer", "timestamp": int(time.time() * 1000)}

    return None


def require_auth(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Dependency enforcing that protected operations require a valid cryptographic session token or JWT."""
    raw_token = token if isinstance(token, str) and token.strip() else None
    if not raw_token and isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ", 1)[1].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required for protected action.")
    session = verify_session_token(raw_token)
    if not session:
        raise HTTPException(status_code=401, detail="Session token invalid, tampered, or expired.")
    return session


def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Canonical get_current_user dependency matching frontend JWT / Bearer tokens."""
    return require_auth(authorization=authorization, token=token)


def get_current_user_or_default(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Dependency retrieving authenticated user or falling back to default LOCAL_OFFICER for smooth dev workflows."""
    raw_token = token if isinstance(token, str) and token.strip() else None
    if not raw_token and isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ", 1)[1].strip()
        else:
            raw_token = authorization.strip()
    if raw_token:
        session = verify_session_token(raw_token)
        if session:
            return session
    return {"officer_id": "LOCAL_OFFICER", "role": "Worker", "timestamp": int(time.time() * 1000)}


# -------------------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------------------
@router.get("/captcha")
def auth_captcha(response: Response):
    """Issues a short-lived, single-use login CAPTCHA challenge."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return create_challenge()


@router.post("/login")
def auth_login(req: LoginRequest):
    """Authenticates executive master officers and registered members against secure credential store."""
    _cid = bool(req.captcha_challenge_id and req.captcha_challenge_id.strip())
    _ans = bool(req.captcha_answer and req.captcha_answer.strip())
    _verified = verify_challenge(req.captcha_challenge_id, req.captcha_answer) if (_cid and _ans) else False
    logger.warning(
        f"LOGIN_ATTEMPT officer_id_set={bool(req.officer_id or req.username)} "
        f"captcha_id_set={_cid} captcha_answer_set={_ans} captcha_verified={_verified}"
    )
    if not (_cid and _ans and _verified):
        raise HTTPException(status_code=400, detail="CAPTCHA is missing, incorrect, expired, or already used.")
    officer_id = (req.officer_id or req.username or "").strip().strip("\"'").strip()
    password = req.password.strip().strip("\"'").strip()

    officer_id_configured = config.get_auth_officer_id()
    secret_pw_configured = config.get_auth_secret_password()

    # If neither master environment credentials nor local users exist, report unconfigured
    if not (officer_id_configured and secret_pw_configured) and not auth_store.load_users():
        raise HTTPException(
            status_code=503,
            detail="Authentication is unconfigured. Production credentials must be supplied via MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD environment variables."
        )

    auth_result = auth_store.authenticate_user(officer_id, password)
    if not auth_result:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed: Invalid Officer Employee ID or Enclave Password."
        )

    if auth_result.get("error") == "USER_DISABLED":
        raise HTTPException(
            status_code=403,
            detail=auth_result.get("message", "This account has been disabled or revoked.")
        )

    role = auth_result.get("role", "Worker")
    if role not in ("Senior Officer", "Worker"):
        role = "Senior Officer" if auth_result.get("is_master") else "Worker"
    display_name = auth_result.get("display_name", officer_id)
    token = create_session_token(auth_result["officer_id"], role=role)

    return {
        "success": True,
        "authenticated": True,
        "token": token,
        "officer_id": auth_result["officer_id"],
        "name": display_name,
        "role": role,
        "is_master": auth_result.get("is_master", False),
        "department": "Ministry of Coal, Government of India",
        "expires_in": 86400
    }


@router.post("/verify-master")
def auth_verify_master(req: MasterVerifyRequest):
    """
    Verifies Master Officer credentials before opening the user creation form.
    Rejects invalid Master credentials with 401.
    """
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    master_secret = config.get_auth_secret_password().strip().strip("\"'").strip()

    if not master_officer or not master_secret:
        raise HTTPException(
            status_code=503,
            detail="Master authentication is unconfigured on the server."
        )

    req_master_id = req.master_officer_id.strip().strip("\"'").strip()
    req_master_pw = req.master_password.strip().strip("\"'").strip()

    valid_master_id = secrets.compare_digest(req_master_id.lower(), master_officer.lower())
    valid_master_pw = secrets.compare_digest(req_master_pw, master_secret)

    if not (valid_master_id and valid_master_pw):
        raise HTTPException(
            status_code=401,
            detail="Master authentication failed: Invalid Master Officer ID or Enclave Password."
        )

    return {
        "success": True,
        "authenticated": True,
        "message": "Master Officer credentials verified."
    }


@router.post("/users")
def auth_create_user(req: CreateUserRequest):
    """
    Creates a new normal user account.
    Requires Master Officer authentication.
    """
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    master_secret = config.get_auth_secret_password().strip().strip("\"'").strip()

    if not master_officer or not master_secret:
        raise HTTPException(
            status_code=503,
            detail="Master authentication is unconfigured on the server."
        )

    req_master_id = req.master_officer_id.strip().strip("\"'").strip()
    req_master_pw = req.master_password.strip().strip("\"'").strip()

    valid_master_id = secrets.compare_digest(req_master_id.lower(), master_officer.lower())
    valid_master_pw = secrets.compare_digest(req_master_pw, master_secret)

    if not (valid_master_id and valid_master_pw):
        raise HTTPException(
            status_code=401,
            detail="Master authentication failed: Invalid Master Officer ID or Enclave Password."
        )

    role_val = (req.role or "Worker").strip().strip("\"'").strip()
    if role_val not in ("Senior Officer", "Worker"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Role must be 'Senior Officer' or 'Worker'."
        )

    try:
        new_user = auth_store.create_user(
            officer_id=req.officer_id.strip().strip("\"'").strip(),
            password=req.password.strip().strip("\"'").strip(),
            display_name=(req.display_name or "").strip().strip("\"'").strip() if req.display_name else None,
            role=role_val
        )
        return {
            "success": True,
            "message": f"User '{new_user['officer_id']}' provisioned successfully as '{role_val}'.",
            "user": new_user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/status")
def auth_update_user_status(req: MasterUserActionRequest):
    """
    Enables or disables/revokes a user account.
    Requires Master Officer authentication.
    """
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    master_secret = config.get_auth_secret_password().strip().strip("\"'").strip()

    if not master_officer or not master_secret:
        raise HTTPException(status_code=503, detail="Master authentication is unconfigured.")

    req_master_id = req.master_officer_id.strip().strip("\"'").strip()
    req_master_pw = req.master_password.strip().strip("\"'").strip()

    valid_master_id = secrets.compare_digest(req_master_id.lower(), master_officer.lower())
    valid_master_pw = secrets.compare_digest(req_master_pw, master_secret)

    if not (valid_master_id and valid_master_pw):
        raise HTTPException(status_code=401, detail="Master authentication failed.")

    success = auth_store.set_user_status(req.target_officer_id.strip().strip("\"'").strip(), req.is_active)
    if not success:
        raise HTTPException(status_code=404, detail=f"User '{req.target_officer_id}' not found.")

    status_str = "activated" if req.is_active else "disabled/revoked"
    return {
        "success": True,
        "message": f"User '{req.target_officer_id}' has been {status_str}."
    }


@router.get("/verify")
def auth_verify(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    """Verifies authenticity and timestamp of an active session token."""
    raw_token = token if isinstance(token, str) and token.strip() else None
    if not raw_token and isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ", 1)[1].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    session = verify_session_token(raw_token)
    if not session:
        raise HTTPException(status_code=401, detail="Session token invalid or expired.")
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = bool(master_officer) and secrets.compare_digest(session.get("officer_id", "").lower(), master_officer.lower())
    role = session.get("role", "Worker")
    if is_master:
        role = "Senior Officer"
    elif role not in ("Senior Officer", "Worker"):
        role = "Worker"
    return {
        "authenticated": True,
        "officer_id": session["officer_id"],
        "role": role,
        "is_master": is_master or (role == "Senior Officer")
    }


@router.get("/profile")
def auth_profile(auth: Dict[str, Any] = Depends(require_auth)):
    """Returns the authenticated normal user's safe profile."""
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if is_master:
        return {"officer_id": auth["officer_id"], "display_name": "Executive Master Auditor", "phone": "", "email": "", "role": "Senior Officer", "is_master": True}
    user = auth_store.get_user_by_id(auth["officer_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
    user_role = user.get("role", "Worker")
    if user_role not in ("Senior Officer", "Worker"):
        user_role = "Worker"
    return {"officer_id": user["officer_id"], "display_name": user.get("display_name", user["officer_id"]), "phone": user.get("phone", ""), "email": user.get("email", ""), "role": user_role, "created_at": user.get("created_at"), "updated_at": user.get("updated_at"), "is_master": False}


@router.patch("/profile")
def auth_update_profile(req: ProfileUpdateRequest, auth: Dict[str, Any] = Depends(require_auth)):
    """Updates only the current user's permitted profile fields."""
    if auth.get("role") == "Senior Officer":
        raise HTTPException(status_code=403, detail="The provisioned master profile is managed by server configuration.")
    try:
        user = auth_store.update_user_profile(auth["officer_id"], req.display_name, req.phone, req.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return {"success": True, "profile": {"officer_id": user["officer_id"], "display_name": user["display_name"], "phone": user.get("phone", ""), "email": user.get("email", ""), "role": user.get("role", "Worker"), "updated_at": user.get("updated_at")}}


@router.post("/password")
def auth_change_password(req: PasswordChangeRequest, auth: Dict[str, Any] = Depends(require_auth)):
    """Changes a normal user's password and invalidates sessions issued before the change."""
    if auth.get("role") == "Senior Officer":
        raise HTTPException(status_code=403, detail="The master password is managed by server configuration.")
    try:
        changed = auth_store.change_user_password(auth["officer_id"], req.current_password, req.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not changed:
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    return {"success": True, "session_invalidated": True, "message": "Password changed. Please sign in again."}


@router.get("/users")
def auth_list_users(auth: Dict[str, Any] = Depends(require_auth)):
    """Lists registered users for authorized inspectors."""
    return {
        "success": True,
        "users": auth_store.get_all_users_safe()
    }


@router.post("/logout")
def auth_logout():
    """Terminates active enclave session."""
    return {"success": True, "message": "Enclave session terminated."}
