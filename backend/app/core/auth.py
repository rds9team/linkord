import datetime
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import generate_session_token
from app.models.models import Account, UserSession

SESSION_COOKIE_NAME = "linkord_session"
SESSION_EXPIRE_DAYS = 30

def get_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None

async def create_user_session(
    db: AsyncSession,
    account_id: int,
    request: Optional[Request] = None,
    expires_days: int = SESSION_EXPIRE_DAYS
) -> UserSession:
    token = generate_session_token()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
    user_agent = request.headers.get("user-agent") if request else None
    ip_address = get_client_ip(request) if request else None

    session = UserSession(
        account_id=account_id,
        session_token=token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

async def delete_user_session(
    db: AsyncSession,
    session_token: str
) -> bool:
    stmt = select(UserSession).where(UserSession.session_token == session_token)
    result = await db.execute(stmt)
    session = result.scalars().first()
    if session:
        await db.delete(session)
        await db.commit()
        return True
    return False

async def get_optional_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[Account]:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:].strip()

    if not session_token:
        return None

    now = datetime.datetime.utcnow()
    stmt = (
        select(UserSession)
        .options(selectinload(UserSession.account).selectinload(Account.links))
        .where(
            UserSession.session_token == session_token,
            UserSession.expires_at > now
        )
    )
    result = await db.execute(stmt)
    user_session = result.scalars().first()
    if not user_session or not user_session.account:
        return None

    account = user_session.account
    if account.deleted_at is not None:
        return None

    return account

async def get_current_user(
    user: Optional[Account] = Depends(get_optional_current_user)
) -> Account:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
