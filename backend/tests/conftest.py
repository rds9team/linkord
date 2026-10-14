import secrets
import datetime
import os
from typing import Optional
from sqlalchemy import select
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import Account, UserSession
from app.main import ensure_schema_updated
import pytest

settings.TESTING = True
os.environ["TESTING"] = "1"

async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_schema_updated(conn)

async def create_test_account_and_session(
    username: str = "test_default_user",
    display_name: str = "Test User",
    has_founder: Optional[bool] = None,
    has_team: Optional[bool] = None,
    has_supporter: bool = False
) -> tuple[Account, str]:
    is_privileged = username in ["yuto", "rds9", "admin"]
    eff_founder = is_privileged if has_founder is None else has_founder
    eff_team = is_privileged if has_team is None else has_team

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
                has_founder=eff_founder,
                has_team=eff_team,
                has_supporter=has_supporter,
            )
            db.add(account)
            await db.commit()
            await db.refresh(account)
        else:
            account.has_supporter = has_supporter
            account.has_founder = eff_founder
            account.has_team = eff_team
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
