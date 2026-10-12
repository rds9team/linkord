import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import (
    hash_ip,
    hash_session_token,
    encrypt_token,
    decrypt_token,
    is_safe_url,
    sanitize_url,
)
from app.models.models import UserSession
from sqlalchemy import select

def test_ip_hashing():
    ip1 = "203.0.113.195"
    ip2 = "198.51.100.24"

    h1 = hash_ip(ip1)
    h2 = hash_ip(ip2)

    assert h1 is not None
    assert h2 is not None
    # 生IPが含まれていないこと
    assert ip1 not in h1
    assert ip2 not in h2
    # 決定論的（同じIPからは同じハッシュ値）
    assert hash_ip(ip1) == h1
    # 異なるIPからは異なるハッシュ値
    assert h1 != h2
    # Noneの場合はNone
    assert hash_ip(None) is None

def test_session_token_hashing():
    raw_token = secrets.token_urlsafe(32)
    hashed = hash_session_token(raw_token)

    assert hashed is not None
    assert len(hashed) == 64  # SHA-256 16進数文字列
    assert raw_token != hashed
    assert hash_session_token(raw_token) == hashed

def test_token_encryption_and_decryption():
    secret_text = "discord_oauth_secret_token_1234567890"
    encrypted = encrypt_token(secret_text)

    assert encrypted is not None
    assert encrypted != secret_text
    assert secret_text not in encrypted

    decrypted = decrypt_token(encrypted)
    assert decrypted == secret_text

    # Noneや空の場合
    assert encrypt_token(None) is None
    assert decrypt_token(None) is None

    # 平文が渡された場合もフォールバックで元の値を返す
    assert decrypt_token("plain_text_without_encryption") == "plain_text_without_encryption"

def test_ssrf_protection():
    # 危険なURL（内部IP、ループバック、メタデータ）はブロックされること
    assert not is_safe_url("http://127.0.0.1/admin")
    assert not is_safe_url("http://localhost:8000/internal")
    assert not is_safe_url("http://169.254.169.254/latest/meta-data/")
    assert not is_safe_url("http://0.0.0.0:8000/")
    assert not is_safe_url("http://10.0.0.1/private")
    assert not is_safe_url("http://192.168.1.1/router")
    assert not is_safe_url("http://172.16.0.5/docker")
    assert not is_safe_url("javascript:alert(1)")
    assert not is_safe_url("data:text/html,<script>alert(1)</script>")
    assert not is_safe_url("ftp://example.com")

    # 安全なURLは許可されること
    assert is_safe_url("https://discord.gg/AMKjxRYKGF")
    assert is_safe_url("https://paypay.ne.jp/app/send?link=xyz")
    assert is_safe_url("https://linkord.net/user/test")

@pytest.mark.asyncio
async def test_session_creation_stores_hashed_data():
    username = f"secuser_{secrets.token_hex(4)}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg_resp = await ac.post("/api/auth/register", json={
            "username": username,
            "password": "StrongPassword123!",
            "display_name": "Security User"
        })
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        raw_token = reg_data["session_token"]

        # DB内のレコードを確認: DBには平文ではなくハッシュ化されたトークンが保存されていること
        expected_hash = hash_session_token(raw_token)
        async with AsyncSessionLocal() as db:
            stmt = select(UserSession).where(UserSession.session_token == expected_hash)
            res = await db.execute(stmt)
            db_session_record = res.scalars().first()

            assert db_session_record is not None, "DBにはハッシュ化されたsession_tokenが保存されている必要があります"
            assert db_session_record.session_token != raw_token
            # 生IPではなくハッシュ化IPが保存されていること
            if db_session_record.ip_address:
                assert db_session_record.ip_address.startswith("h_")

        # 認証エンドポイント（/api/auth/me）がそのCookieで正常に認証できること
        me_resp = await ac.get("/api/auth/me", cookies={"linkord_session": raw_token})
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == username

@pytest.mark.asyncio
async def test_security_headers_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/health")
        assert resp.status_code == 200
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "SAMEORIGIN"
        assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in resp.headers.get("permissions-policy", "")
        assert resp.headers.get("cross-origin-opener-policy") == "same-origin"
