import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base
from tests.conftest import create_test_account_and_session

@pytest.mark.asyncio
async def test_playhive_modes_and_stats():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test modes endpoint
        modes_res = await ac.get("/api/minecraft/modes")
        assert modes_res.status_code == 200
        modes = modes_res.json()
        assert isinstance(modes, list)
        mode_ids = [m["id"] for m in modes]
        assert "bed" in mode_ids
        assert "bridge" in mode_ids
        assert "sky" in mode_ids
        assert "sg" in mode_ids
        assert "wars" in mode_ids

        # Test stats endpoint with fallback for non-existent player
        stats_res = await ac.get("/api/minecraft/non_existent_player_12345/bed")
        assert stats_res.status_code == 200
        data = stats_res.json()
        assert "data" in data
        assert data["data"]["gamemode"] == "bed"
        assert data["data"]["gamemode_name"] == "BedWars"

@pytest.mark.asyncio
async def test_social_links_update_and_view_count():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    account, token = await create_test_account_and_session("linksuser", has_supporter=False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})

        # Update profile with links
        links_payload = [
            {"title": "Discord", "url": "https://discord.com/users/123456789", "icon": "discord"},
            {"title": "GitHub", "url": "https://github.com/linksuser", "icon": "github"},
            {"title": "X", "url": "https://x.com/linksuser", "icon": "x"},
        ]
        patch_res = await ac.patch("/api/profile/me", json={
            "links": links_payload,
            "minecraft_uuid": "Plursche"
        })
        assert patch_res.status_code == 200
        patched_data = patch_res.json()
        assert len(patched_data["links"]) == 3
        assert patched_data["links"][0]["title"] == "Discord"
        assert patched_data["links"][0]["url"] == "https://discord.com/users/123456789"
        assert patched_data["minecraft_uuid"] == "Plursche"

        # View own profile while logged in - views_count should NOT increment
        initial_views = patched_data["views_count"]
        view_res1 = await ac.get("/api/profile/linksuser")
        assert view_res1.status_code == 200
        assert view_res1.json()["views_count"] == initial_views

        # Test max 8 links (success with exactly 8 links)
        max_links_payload = [
            {"title": f"Site {i}", "url": f"https://example.com/{i}", "icon": "globe"}
            for i in range(8)
        ]
        ok_res = await ac.patch("/api/profile/me", json={"links": max_links_payload})
        assert ok_res.status_code == 200
        assert len(ok_res.json()["links"]) == 8

        # Test exceeding 8 links (should fail with 422 Unprocessable Entity or 400 Bad Request)
        too_many_links = [
            {"title": f"Site {i}", "url": f"https://example.com/{i}", "icon": "globe"}
            for i in range(9)
        ]
        fail_res = await ac.patch("/api/profile/me", json={"links": too_many_links})
        assert fail_res.status_code in (400, 422)

        # Test unsafe javascript: scheme (should fail with 422)
        unsafe_res = await ac.patch("/api/profile/me", json={
            "links": [{"title": "XSS", "url": "javascript:alert(1)", "icon": "link"}]
        })
        assert unsafe_res.status_code in (400, 422)
