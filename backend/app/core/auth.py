import datetime
import hmac
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import generate_session_token, hash_session_token, hash_ip
from app.models.models import Account, UserSession

SESSION_COOKIE_NAME = "linkord_session"
SESSION_EXPIRE_DAYS = 30

def get_client_ip(request: Request) -> Optional[str]:
    peer = request.client.host if request.client else None

    # Cloudflare Pages Functions のプロキシ経由: 共有シークレットが一致した場合のみ転送元IPを採用
    if settings.PROXY_SHARED_SECRET:
        proxy_secret = request.headers.get("x-linkord-proxy-secret") or ""
        proxied_ip = request.headers.get("x-linkord-client-ip")
        if proxied_ip and hmac.compare_digest(proxy_secret, settings.PROXY_SHARED_SECRET):
            return proxied_ip.strip()

    # 直接の接続元が信頼済みプロキシ（Cloudflare Tunnel 等）の場合のみ転送ヘッダーを見る。
    # X-Forwarded-For の先頭はクライアントが自由に書けるため使わない
    if peer and peer in settings.get_trusted_proxy_ips():
        cf_ip = request.headers.get("cf-connecting-ip")
        if cf_ip:
            return cf_ip.strip()
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[-1].strip()

    return peer


def is_admin(account: Account) -> bool:
    return (
        account.id in settings.get_admin_account_ids()
        or bool(account.has_founder)
        or bool(account.has_team)
    )


def is_super_admin(account: Account) -> bool:
    """Founderバッジの付与など、最上位の権限が必要な操作用"""
    return account.id in settings.get_admin_account_ids() or bool(account.has_founder)

async def create_user_session(
    db: AsyncSession,
    account_id: int,
    request: Optional[Request] = None,
    expires_days: int = SESSION_EXPIRE_DAYS
) -> UserSession:
    raw_token = generate_session_token()
    hashed_token = hash_session_token(raw_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
    user_agent = request.headers.get("user-agent") if request else None
    
    # 生IPはDBに一切保存せず、ソルト付き不可逆ハッシュとして保存（DoubleCounter漏洩対策）
    raw_ip = get_client_ip(request) if request else None
    hashed_ip = hash_ip(raw_ip)

    session = UserSession(
        account_id=account_id,
        session_token=hashed_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=hashed_ip,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # クライアントのCookie/レスポンスへ返す平文トークンを一時プロパティとして保持
    session.raw_token = raw_token
    session.session_token = raw_token
    return session

async def delete_user_session(
    db: AsyncSession,
    session_token: str
) -> bool:
    hashed_token = hash_session_token(session_token)
    stmt = select(UserSession).where(UserSession.session_token == hashed_token)
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
    hashed_token = hash_session_token(session_token)
    stmt = (
        select(UserSession)
        .options(selectinload(UserSession.account).selectinload(Account.links))
        .where(
            UserSession.session_token == hashed_token,
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
