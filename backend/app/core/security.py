import hmac
import hashlib
import time
import secrets
from urllib.parse import urlparse
from typing import Optional
from app.core.config import settings

def generate_session_token() -> str:
    return secrets.token_urlsafe(32)

def generate_oauth_state(provider: str) -> str:
    timestamp = str(int(time.time()))
    random_str = secrets.token_hex(16)
    message = f"{provider}:{timestamp}:{random_str}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{message}:{signature}"

def verify_oauth_state(state: str, provider: str, max_age_seconds: int = 600) -> bool:
    try:
        parts = state.split(":")
        if len(parts) != 4:
            return False
        st_provider, st_time, st_random, st_sig = parts
        if st_provider != provider:
            return False
        
        # Check expiry
        if int(time.time()) - int(st_time) > max_age_seconds:
            return False
            
        expected_msg = f"{st_provider}:{st_time}:{st_random}"
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            expected_msg.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(st_sig, expected_sig)
    except Exception:
        return False

import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    pwd_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

def sanitize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return None
    return url

# Re-export auth dependencies
from app.core.auth import (
    get_current_user,
    get_optional_current_user,
    create_user_session,
    delete_user_session,
    SESSION_COOKIE_NAME,
    SESSION_EXPIRE_DAYS,
    get_client_ip,
)
