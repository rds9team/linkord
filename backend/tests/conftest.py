import secrets
import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import Account, UserSession

async def create_test_account_and_session(
    username: str = "yuto",
    display_name: str = "Test User",
    has_founder: bool = True,
    has_supporter: bool = False
) -> tuple[Account, str]:
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == username)
        res = await db.execute(stmt)
        account = res.scalars().first()
        if not account:
            account = Account(
                username=username,
                tag=None,
                display_name=display_name,
                bio="Test user bio",
                theme_id="midnight",
                theme_mode="dark",
                has_discord_authed=True,
                has_founder=has_founder,
                has_team=True,
                has_supporter=has_supporter,
            )
            db.add(account)
            await db.commit()
            await db.refresh(account)
        token = secrets.token_urlsafe(32)
        sess = UserSession(
            account_id=account.id,
            session_token=token,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=30),
        )
        db.add(sess)
        await db.commit()
        return account, token
