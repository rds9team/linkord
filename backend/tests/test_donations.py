import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import Account, Donation

@pytest.mark.asyncio
async def test_paypay_donation_and_admin_flow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Invalid PayPay URL should fail
        bad_res = await ac.post("/api/donations", json={
            "paypay_url": "https://malicious-site.com/fake",
            "message": "Hello"
        })
        assert bad_res.status_code == 422

        # 2. Valid PayPay URL without login (anonymous)
        valid_res = await ac.post("/api/donations", json={
            "paypay_url": "https://pay.paypay.ne.jp/abc123XYZ",
            "passcode": "1234",
            "amount": 500,
            "message": "応援してます！"
        })
        assert valid_res.status_code == 201
        data = valid_res.json()
        assert data["paypay_url"] == "https://pay.paypay.ne.jp/abc123XYZ"
        assert data["status"] == "pending"
        assert data["passcode"] == "1234"
        donation_id = data["id"]

        # 3. Dev login as "yuto"
        login_res = await ac.post("/api/auth/dev-login")
        assert login_res.status_code == 200

        # 4. Authenticated user sends donation
        user_donation_res = await ac.post("/api/donations", json={
            "paypay_url": "https://pay.paypay.ne.jp/userDonation999",
            "amount": 1000,
            "message": "サポーターになります！"
        })
        assert user_donation_res.status_code == 201
        user_d_id = user_donation_res.json()["id"]

        # 5. Check my profile has_supporter is currently False (or reset)
        me_res = await ac.get("/api/auth/me")
        assert me_res.status_code == 200

        # 6. Admin resolves donation and grants supporter badge
        # Set yuto as admin
        from app.core.config import settings
        orig_admins = settings.ADMIN_USERNAMES
        settings.ADMIN_USERNAMES = "yuto,admin"

        try:
            # List donations
            admin_list_res = await ac.get("/api/admin/donations")
            assert admin_list_res.status_code == 200
            donations = admin_list_res.json()
            assert len(donations) >= 2

            # Approve user donation
            approve_res = await ac.post(f"/api/admin/donations/{user_d_id}/resolve", json={
                "action": "approve",
                "admin_note": "PayPay受け取り確認完了"
            })
            assert approve_res.status_code == 200
            assert approve_res.json()["status"] == "approved"

            # Check profile now has supporter badge
            me_after = await ac.get("/api/auth/me")
            assert me_after.status_code == 200
            assert me_after.json()["has_supporter"] is True

        finally:
            settings.ADMIN_USERNAMES = orig_admins
