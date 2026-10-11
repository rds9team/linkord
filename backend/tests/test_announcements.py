import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from tests.conftest import create_test_account_and_session, init_test_db

@pytest.mark.asyncio
async def test_announcements_flow():
    await init_test_db()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Non-admin trying to post announcement -> 403
        user_acc, user_token = await create_test_account_and_session("regular_user_ann")
        user_client = AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {user_token}"})
        
        fail_res = await user_client.post("/api/announcements", json={
            "title": "不正なお知らせ",
            "content": "管理者以外は投稿不可"
        })
        assert fail_res.status_code == 403

        # 2. Admin creating announcement -> 201
        admin_acc, admin_token = await create_test_account_and_session("yuto", has_founder=True)
        admin_client = AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {admin_token}"})

        create_res = await admin_client.post("/api/announcements", json={
            "title": "v1.2 アップデートのお知らせ",
            "content": "新機能が追加されました！通知ボックスから確認できます。",
            "type": "update",
            "link_url": "https://linkord.net"
        })
        assert create_res.status_code == 201
        created_data = create_res.json()
        assert created_data["title"] == "v1.2 アップデートのお知らせ"
        assert created_data["type"] == "update"
        ann_id = created_data["id"]

        # 3. Public listing announcements -> 200
        list_res = await client.get("/api/announcements")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        assert any(item["id"] == ann_id for item in items)

        # 4. Admin delete announcement -> 200
        del_res = await admin_client.delete(f"/api/announcements/{ann_id}")
        assert del_res.status_code == 200

        # 5. Check deleted
        list_res_after = await client.get("/api/announcements")
        items_after = list_res_after.json()
        assert not any(item["id"] == ann_id for item in items_after)
