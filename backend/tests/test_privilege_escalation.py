import secrets
import pytest
from httpx import AsyncClient, ASGITransport
from starlette.requests import Request

from app.main import app
from app.core.auth import get_client_ip
from app.core.config import settings
from app.services.image_cache import is_allowed_image_source
from tests.conftest import create_test_account_and_session


@pytest.mark.asyncio
async def test_reserved_usernames_cannot_be_registered():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for name in ("admin", "rds9", "settings"):
            res = await ac.post("/api/auth/register", json={"username": name, "password": "StrongPassword123!"})
            assert res.status_code == 422, name


@pytest.mark.asyncio
async def test_admin_access_is_not_granted_by_username():
    # A plain account whose username happens to match a former admin name gets no admin access
    _, token = await create_test_account_and_session("yuto0926space", has_founder=False, has_team=False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token}"}) as ac:
        assert (await ac.get("/api/admin/check")).status_code == 403


@pytest.mark.asyncio
async def test_cannot_rename_to_reserved_username():
    _, token = await create_test_account_and_session(f"rename_{secrets.token_hex(3)}")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token}"}) as ac:
        res = await ac.patch("/api/profile/me", json={"username": "admin"})
        assert res.status_code in (400, 422)


@pytest.mark.asyncio
async def test_plaintext_session_token_is_rejected():
    # Sessions are looked up by hash only; a DB value used directly as a token must not authenticate
    from app.core.database import AsyncSessionLocal
    from app.models.models import UserSession
    from sqlalchemy import select

    _, token = await create_test_account_and_session(f"tok_{secrets.token_hex(3)}")
    async with AsyncSessionLocal() as db:
        stored = (await db.execute(select(UserSession).order_by(UserSession.id.desc()))).scalars().first()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        assert (await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})).status_code == 200
        assert (await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {stored.session_token}"})).status_code == 401


def _request(peer: str, headers: dict) -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (peer, 1234),
    })


def test_client_ip_ignores_spoofed_headers_from_untrusted_peer():
    req = _request("203.0.113.5", {"X-Forwarded-For": "1.2.3.4", "CF-Connecting-IP": "5.6.7.8"})
    assert get_client_ip(req) == "203.0.113.5"


def test_client_ip_uses_cloudflare_header_behind_tunnel():
    req = _request("127.0.0.1", {"X-Forwarded-For": "1.2.3.4, 9.9.9.9", "CF-Connecting-IP": "5.6.7.8"})
    assert get_client_ip(req) == "5.6.7.8"


def test_client_ip_trusts_pages_proxy_only_with_secret():
    original = settings.PROXY_SHARED_SECRET
    settings.PROXY_SHARED_SECRET = "s3cret"
    try:
        good = _request("127.0.0.1", {"X-Linkord-Client-IP": "7.7.7.7", "X-Linkord-Proxy-Secret": "s3cret", "CF-Connecting-IP": "8.8.8.8"})
        bad = _request("127.0.0.1", {"X-Linkord-Client-IP": "7.7.7.7", "X-Linkord-Proxy-Secret": "wrong", "CF-Connecting-IP": "8.8.8.8"})
        assert get_client_ip(good) == "7.7.7.7"
        assert get_client_ip(bad) == "8.8.8.8"
    finally:
        settings.PROXY_SHARED_SECRET = original


def test_image_proxy_source_must_be_exact_discord_host():
    assert is_allowed_image_source("https://cdn.discordapp.com/icons/1/a.png")
    assert not is_allowed_image_source("https://evil.example/?u=cdn.discordapp.com")
    assert not is_allowed_image_source("https://cdn.discordapp.com.evil.example/a.png")
    assert not is_allowed_image_source("http://cdn.discordapp.com/a.png")
    assert not is_allowed_image_source("https://user@evil.example/cdn.discordapp.com")


@pytest.mark.asyncio
async def test_media_proxy_rejects_non_discord_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/media/proxy", params={"url": "http://169.254.169.254/?cdn.discordapp.com"})
        assert res.status_code == 400
