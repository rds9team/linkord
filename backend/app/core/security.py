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
import base64
import ipaddress
from cryptography.fernet import Fernet, InvalidToken

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

def hash_ip(ip: Optional[str]) -> Optional[str]:
    """
    IPアドレスを不可逆なソルト付きHMAC-SHA256ハッシュに変換。
    生のIPアドレスをデータベースに一切残さず、プライバシーとDoubleCounter攻撃同等の漏洩を防ぐ。
    """
    if not ip:
        return None
    clean_ip = ip.strip()
    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        clean_ip.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"h_{sig[:32]}"

def hash_session_token(token: str) -> str:
    """
    セッショントークンをSHA-256でハッシュ化してDBに保存するための関数。
    万が一DBが奪われてもセッション乗っ取りを防止する。
    """
    if not token:
        return ""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def _get_cipher() -> Fernet:
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_token(plain_text: Optional[str]) -> Optional[str]:
    """機密トークンやパスコードをAES対称暗号化してDBに保存"""
    if not plain_text:
        return None
    try:
        cipher = _get_cipher()
        return cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return plain_text

def decrypt_token(cipher_text: Optional[str]) -> Optional[str]:
    """暗号化された機密トークンを復号（既存の平文データがある場合はフォールバック）"""
    if not cipher_text:
        return None
    try:
        cipher = _get_cipher()
        return cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return cipher_text

def is_safe_url(url: Optional[str]) -> bool:
    """SSRF攻撃（内部IP、クラウドメタデータへのアクセス等）を防止するURLバリデータ"""
    if not url:
        return False
    url = url.strip()
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        hostname = hostname.lower()
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "metadata.google.internal"):
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                return False
        except ValueError:
            if hostname.endswith(".local") or hostname.endswith(".internal"):
                return False
        return True
    except Exception:
        return False

def sanitize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    if not is_safe_url(url):
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
