import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import Account, Report, Follow

@pytest.mark.asyncio
async def test_follow_list_and_search_and_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ts = int(time.time())
    admin_uname = f"admin_{ts}"
    user2_uname = f"user2_{ts}"

    # Insert test users directly in DB
    async with AsyncSessionLocal() as db:
        admin_acc = Account(
            username=admin_uname,
            display_name="Admin User",
            bio="Administrator of Linkord",
            theme_id="midnight",
            theme_mode="dark",
            is_public=True
        )
        user2_acc = Account(
            username=user2_uname,
            display_name="Regular User",
            bio="Just a gamer",
            theme_id="midnight",
            theme_mode="dark",
            is_public=True
        )
        db.add_all([admin_acc, user2_acc])
        await db.commit()
        await db.refresh(admin_acc)
        await db.refresh(user2_acc)
        admin_id = admin_acc.id
        user2_id = user2_acc.id

        # Make user2 follow admin
        follow = Follow(follower_id=user2_id, following_id=admin_id)
        # Create a sample report
        rep = Report(
            target_type="profile",
            target_id=user2_uname,
            reason="spam",
            description="Testing spam report",
            status="pending"
        )
        db.add_all([follow, rep])
        await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Search profiles
        res_search = await ac.get(f"/api/profile/search?q={user2_uname}")
        assert res_search.status_code == 200
        search_data = res_search.json()
        assert len(search_data) >= 1
        assert any(u["username"] == user2_uname for u in search_data)

        # 2. Get admin followers (should have user2)
        res_followers = await ac.get(f"/api/profile/{admin_uname}/followers")
        assert res_followers.status_code == 200
        followers = res_followers.json()
        assert len(followers) >= 1
        assert followers[0]["username"] == user2_uname

        # 3. Get user2 following (should have admin)
        res_following = await ac.get(f"/api/profile/{user2_uname}/following")
        assert res_following.status_code == 200
        following = res_following.json()
        assert len(following) >= 1
        assert following[0]["username"] == admin_uname

        # 4. Admin endpoint check without admin login (dev-login is user "yuto")
        await ac.post("/api/auth/dev-login")
        # "yuto" is not in ADMIN_USERNAMES so /api/admin/reports should be 403
        res_admin_forbidden = await ac.get("/api/admin/reports")
        assert res_admin_forbidden.status_code == 403

        # Configure settings to allow "yuto" as admin for testing
        from app.core.config import settings
        original_admins = settings.ADMIN_USERNAMES
        settings.ADMIN_USERNAMES = f"{original_admins},yuto"

        try:
            # 5. Admin stats
            res_stats = await ac.get("/api/admin/stats")
            assert res_stats.status_code == 200
            stats = res_stats.json()
            assert stats["total_users"] >= 2
            assert stats["total_reports"] >= 1

            # 6. Admin list reports
            res_reports = await ac.get("/api/admin/reports?status=pending")
            assert res_reports.status_code == 200
            reports = res_reports.json()
            assert len(reports) >= 1
            report_id = reports[0]["id"]

            # 7. Update report
            res_update_rep = await ac.patch(f"/api/admin/reports/{report_id}", json={
                "status": "resolved",
                "admin_note": "Handled by test"
            })
            assert res_update_rep.status_code == 200
            assert res_update_rep.json()["status"] == "resolved"

            # 8. Toggle profile visibility
            res_vis = await ac.patch(f"/api/admin/profiles/{user2_uname}/visibility")
            assert res_vis.status_code == 200
            assert res_vis.json()["is_public"] is False
        finally:
            settings.ADMIN_USERNAMES = original_admins

        # 9. Test delete account & 410 Gone with dedicated user
        del_user_uname = f"del_{ts}"
        async with AsyncSessionLocal() as db:
            del_user = Account(
                username=del_user_uname,
                display_name="To Delete",
                bio="Will be deleted",
                theme_id="midnight",
                theme_mode="dark",
                is_public=True
            )
            db.add(del_user)
            await db.commit()
            await db.refresh(del_user)
            del_user_id = del_user.id

            from app.models.models import UserSession
            import secrets, datetime
            token = secrets.token_urlsafe(32)
            sess = UserSession(
                account_id=del_user_id,
                session_token=token,
                expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=1)
            )
            db.add(sess)
            await db.commit()

        # Delete account as del_user via Bearer token with fresh client
        async with AsyncClient(transport=transport, base_url="http://test") as del_ac:
            del_acc_res = await del_ac.post("/api/auth/delete-account", headers={"Authorization": f"Bearer {token}"})
            assert del_acc_res.status_code == 200

            # Now fetching del_user_uname profile should return 410 Gone
            res_deleted_profile = await del_ac.get(f"/api/profile/{del_user_uname}")
            assert res_deleted_profile.status_code == 410


