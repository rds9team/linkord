import time
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base
from tests.conftest import create_test_account_and_session

@pytest.mark.asyncio
async def test_full_auth_and_api_flow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ts = int(time.time())
    test_slug = f"test-srv-{ts}"

    account, token = await create_test_account_and_session("yuto", has_supporter=True)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health check
        res = await ac.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Unauthorized access to /api/auth/me should fail with 401
        res = await ac.get("/api/auth/me")
        assert res.status_code == 401

        # 3. Auth via session token
        ac.headers.update({"Authorization": f"Bearer {token}"})

        # 4. Authorized /api/auth/me
        me_res = await ac.get("/api/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["username"] == "yuto"
        assert me_data["has_discord_authed"] is True

        # 5. Get profile /api/profile/me
        p_res = await ac.get("/api/profile/me")
        assert p_res.status_code == 200
        assert p_res.json()["username"] == "yuto"

        # 6. Update profile /api/profile/me
        patch_res = await ac.patch("/api/profile/me", json={"bio": "Updated bio via test"})
        assert patch_res.status_code == 200
        assert patch_res.json()["bio"] == "Updated bio via test"

        # 7. Create server /api/servers
        srv_res = await ac.post("/api/servers", json={
            "slug": test_slug,
            "name": "Test Community",
            "description": "A community for testing",
            "invite_url": "https://discord.gg/test",
            "tags": "test,gaming",
            "language": "ja"
        })
        assert srv_res.status_code == 201
        srv_data = srv_res.json()
        assert srv_data["slug"] == test_slug
        assert srv_data["name"] == "Test Community"

        # 8. Try to create duplicate slug -> 400
        dup_srv = await ac.post("/api/servers", json={
            "slug": test_slug,
            "name": "Duplicate",
            "invite_url": "https://discord.gg/dup"
        })
        assert dup_srv.status_code == 400

        # 9. Server boost
        boost_res = await ac.post(f"/api/servers/{srv_data['id']}/boost")
        assert boost_res.status_code == 200
        # Boost again within 1 hour -> 429
        boost_dup = await ac.post(f"/api/servers/{srv_data['id']}/boost")
        assert boost_dup.status_code == 429

        # 10. Self profile boost should fail -> 400
        self_boost = await ac.post("/api/profile/yuto/boost")
        assert self_boost.status_code == 400

        # 11. OAuth login endpoints
        d_login = await ac.get("/api/auth/discord/login")
        assert d_login.status_code == 200
        assert "url" in d_login.json()

        g_login = await ac.get("/api/auth/google/login")
        assert g_login.status_code == 200
        assert "url" in g_login.json()

        # 12. OAuth callback with invalid state -> 400
        d_cb = await ac.get("/api/auth/discord/callback?code=mock&state=invalid_state")
        assert d_cb.status_code == 400

        g_cb = await ac.get("/api/auth/google/callback?code=mock&state=invalid_state")
        assert g_cb.status_code == 400

        # 13. Logout
        logout_res = await ac.post("/api/auth/logout")
        assert logout_res.status_code == 200

        # 14. Access /api/auth/me after logout -> 401
        ac.headers.pop("Authorization", None)
        after_logout = await ac.get("/api/auth/me")
        assert after_logout.status_code == 401

    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_full_auth_and_api_flow())
