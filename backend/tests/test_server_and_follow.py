import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base
from tests.conftest import create_test_account_and_session

@pytest.mark.asyncio
async def test_server_crud_and_follow():
    # Setup database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ts = int(time.time())
    srv_slug = f"crud-server-{ts}"

    account, token = await create_test_account_and_session("server_user")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token}"}) as ac:
        # 1. Create server with icon_url
        create_res = await ac.post("/api/servers", json={
            "slug": srv_slug,
            "name": "CRUD Test Server",
            "description": "Server description",
            "icon_url": "https://example.com/icon.png",
            "invite_url": "https://discord.gg/crudtest",
            "tags": "test,gaming",
            "language": "ja"
        })
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["slug"] == srv_slug
        assert data["icon_url"] == "https://example.com/icon.png"

        # 2. Get server
        get_res = await ac.get(f"/api/servers/{srv_slug}")
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "CRUD Test Server"

        # 3. Update server
        update_res = await ac.patch(f"/api/servers/{srv_slug}", json={
            "name": "Updated Server Name",
            "description": "New description"
        })
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Updated Server Name"
        assert update_res.json()["description"] == "New description"

        # 4. Check follow self should fail (400)
        follow_self_res = await ac.post("/api/profile/server_user/follow")
        assert follow_self_res.status_code == 400

        # 5. Delete server
        del_res = await ac.delete(f"/api/servers/{srv_slug}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "ok"

        # 6. Verify deleted
        get_deleted = await ac.get(f"/api/servers/{srv_slug}")
        assert get_deleted.status_code == 404
