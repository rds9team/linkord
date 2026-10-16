import secrets
import datetime
import os
from typing import Optional
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

TEST_DB_FILE = "test_linkord.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///./{TEST_DB_FILE}"

os.environ["TESTING"] = "1"
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.core.config import settings
settings.TESTING = True
settings.DATABASE_URL = TEST_DATABASE_URL

from app.models.models import Account, UserSession
from app.core.database import Base, get_db
import app.core.database as core_db
from app.main import ensure_schema_updated, app

# Create isolated test engine and sessionmaker
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# Override core_db engine and session
core_db.engine = test_engine
core_db.AsyncSessionLocal = TestAsyncSessionLocal

async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

async def init_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_schema_updated(conn)

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield
    # Cleanup test db file after test suite finishes
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

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

    async with TestAsyncSessionLocal() as db:
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
