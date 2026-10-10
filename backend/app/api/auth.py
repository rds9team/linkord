import re
import secrets
import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.security import generate_oauth_state, verify_oauth_state, hash_password, verify_password
from app.core.auth import (
    get_current_user,
    create_user_session,
    delete_user_session,
    SESSION_COOKIE_NAME,
)
from app.models.models import Account, AccountIdentity
from app.schemas.schemas import AccountMeOut, UserRegister, UserLogin

router = APIRouter(prefix="/auth", tags=["auth"])

def set_auth_cookie(response: Response, session_token: str) -> None:
    is_production = settings.APP_ENV == "production"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=is_production,
        max_age=30 * 86400,
        path="/",
        domain=".linkord.net" if is_production else None,
    )

async def generate_unique_tag(db: AsyncSession, username: str) -> str:
    stmt = select(Account.tag).where(Account.username == username)
    res = await db.execute(stmt)
    existing_tags = set(res.scalars().all())

    # 1. 0001〜9999からランダムに試行
    for _ in range(50):
        val = secrets.randbelow(9999) + 1
        candidate = f"{val:04d}"
        if candidate not in existing_tags:
            return candidate

    # 2. 衝突が多い場合は1から空きを探す
    for val in range(1, 10000):
        candidate = f"{val:04d}"
        if candidate not in existing_tags:
            return candidate

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"ユーザー名 '{username}' のタグ番号（0001〜9999）が上限に達しています。別のユーザー名をお試しください。"
    )

async def generate_unique_username(db: AsyncSession, base_name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", base_name.lower())
    if not cleaned:
        cleaned = "user"
    return cleaned[:24]

@router.post("/register")
async def register_account(
    req_data: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    clean_username = req_data.username.lower().strip()
    tag = await generate_unique_tag(db, clean_username)
    display_name = req_data.display_name.strip() if req_data.display_name else clean_username

    account = Account(
        username=clean_username,
        tag=tag,
        display_name=display_name[:64],
        password_hash=hash_password(req_data.password),
        last_login_at=datetime.datetime.utcnow(),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)

    session = await create_user_session(db, account.id, request)
    set_auth_cookie(response, session.session_token)

    return {
        "status": "ok",
        "user": {
            "id": account.id,
            "username": account.username,
            "tag": account.tag,
            "full_username": account.full_username,
            "display_name": account.display_name,
        },
        "session_token": session.session_token
    }

@router.post("/login")
async def login_account(
    login_data: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    identifier = login_data.identifier.strip()
    target_username = identifier
    target_tag: Optional[str] = None

    if "#" in identifier:
        parts = identifier.split("#", 1)
        target_username = parts[0].strip().lower()
        target_tag = parts[1].strip()
    else:
        target_username = identifier.lower()

    if target_tag:
        stmt = (
            select(Account)
            .options(selectinload(Account.links))
            .where(Account.username == target_username, Account.tag == target_tag, Account.deleted_at.is_(None))
        )
        res = await db.execute(stmt)
        account = res.scalars().first()
    else:
        stmt = (
            select(Account)
            .options(selectinload(Account.links))
            .where(Account.username == target_username, Account.deleted_at.is_(None))
        )
        res = await db.execute(stmt)
        accounts = res.scalars().all()
        if len(accounts) == 1:
            account = accounts[0]
        elif len(accounts) > 1:
            matching = [acc for acc in accounts if verify_password(login_data.password, acc.password_hash)]
            if len(matching) == 1:
                account = matching[0]
            elif len(matching) > 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="同名のユーザーが複数存在します。タグ番号を含めて入力してください（例: username#0001）"
                )
            else:
                account = None
        else:
            account = None

    if not account or not verify_password(login_data.password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが正しくありません"
        )

    account.last_login_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(account)

    session = await create_user_session(db, account.id, request)
    set_auth_cookie(response, session.session_token)

    return {
        "status": "ok",
        "user": {
            "id": account.id,
            "username": account.username,
            "tag": account.tag,
            "full_username": account.full_username,
            "display_name": account.display_name,
        },
        "session_token": session.session_token
    }

@router.get("/me", response_model=AccountMeOut)
async def get_me(current_user: Account = Depends(get_current_user)):
    return current_user

@router.get("/discord/login")
def discord_login():
    state = generate_oauth_state("discord")
    if not settings.DISCORD_CLIENT_ID:
        return {"url": f"{settings.FRONTEND_URL}/login?status=discord_mock&state={state}"}

    discord_auth_url = (
        f"https://discord.com/api/oauth2/authorize?"
        f"client_id={settings.DISCORD_CLIENT_ID}&"
        f"redirect_uri={settings.DISCORD_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=identify%20email&"
        f"state={state}"
    )
    return {"url": discord_auth_url}

@router.get("/discord/callback")
async def discord_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={error}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

    if not state or not verify_oauth_state(state, "discord"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れの認証リクエスト(state)です"
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="認可コード(code)が指定されていません"
        )

    if not settings.DISCORD_CLIENT_ID or not settings.DISCORD_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discord OAuth2 が設定されていません (DISCORD_CLIENT_ID / SECRET が未設定です)"
        )

    token_url = "https://discord.com/api/oauth2/token"
    token_data = {
        "client_id": settings.DISCORD_CLIENT_ID,
        "client_secret": settings.DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.DISCORD_REDIRECT_URI,
    }
    token_headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with httpx.AsyncClient() as client:
        try:
            token_res = await client.post(token_url, data=token_data, headers=token_headers)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Discord トークン取得リクエストに失敗しました: {exc}"
            )

        if token_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discord トークン交換に失敗しました: {token_res.text}"
            )

        token_json = token_res.json()
        access_token = token_json.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discord access_token が取得できませんでした"
            )

        try:
            user_res = await client.get(
                "https://discord.com/api/users/@me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Discord ユーザー情報リクエストに失敗しました: {exc}"
            )

        if user_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discord ユーザー情報の取得に失敗しました: {user_res.text}"
            )

        user_data = user_res.json()

    discord_user_id = str(user_data["id"])
    discord_username = user_data.get("username", "user")
    discord_email = user_data.get("email")
    global_name = user_data.get("global_name") or discord_username
    avatar_hash = user_data.get("avatar")
    avatar_url = (
        f"https://cdn.discordapp.com/avatars/{discord_user_id}/{avatar_hash}.png"
        if avatar_hash else None
    )

    stmt = (
        select(AccountIdentity)
        .options(selectinload(AccountIdentity.account).selectinload(Account.links))
        .where(
            AccountIdentity.provider == "discord",
            AccountIdentity.provider_user_id == discord_user_id
        )
    )
    res = await db.execute(stmt)
    identity = res.scalars().first()

    if identity and identity.account:
        account = identity.account
        account.last_login_at = datetime.datetime.utcnow()
        account.has_discord_authed = True
        if not account.discord_id:
            account.discord_id = discord_user_id
        if avatar_url and not account.avatar_url:
            account.avatar_url = avatar_url
        if discord_email:
            account.email = discord_email
    else:
        # メールアドレスで既存アカウントがあるか確認して自動連携
        existing_account = None
        if discord_email:
            email_stmt = select(Account).where(Account.email == discord_email)
            email_res = await db.execute(email_stmt)
            existing_account = email_res.scalars().first()

        if existing_account:
            account = existing_account
            account.last_login_at = datetime.datetime.utcnow()
            account.has_discord_authed = True
            if not account.discord_id:
                account.discord_id = discord_user_id
            if avatar_url and not account.avatar_url:
                account.avatar_url = avatar_url
        else:
            # Discordのユーザー名（pomeloユニーク）をそのまま小文字で使用
            clean_username = discord_username.lower().strip()
            clean_username = re.sub(r"[^a-zA-Z0-9_\.]", "_", clean_username)
            if len(clean_username) < 2:
                clean_username = f"user_{discord_user_id[-6:]}"
            elif len(clean_username) > 32:
                clean_username = clean_username[:32]

            # 既存のusernameとの重複フォールバック
            target_username = clean_username
            suffix = 1
            while True:
                exist_stmt = select(Account).where(Account.username == target_username)
                exist_res = await db.execute(exist_stmt)
                if not exist_res.scalars().first():
                    break
                target_username = f"{clean_username[:26]}_{suffix}"
                suffix += 1

            account = Account(
                username=target_username,
                tag=None, # Discord連携ユーザーはタグなし
                display_name=global_name[:64],
                avatar_url=avatar_url,
                email=discord_email,
                discord_id=discord_user_id,
                has_discord_authed=True,
                last_login_at=datetime.datetime.utcnow(),
            )
            db.add(account)
            await db.flush()

        identity = AccountIdentity(
            account_id=account.id,
            provider="discord",
            provider_user_id=discord_user_id,
            provider_username=discord_username
        )
        db.add(identity)

    await db.commit()
    await db.refresh(account)

    session = await create_user_session(db, account.id, request)

    redirect_response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/settings",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT
    )
    set_auth_cookie(redirect_response, session.session_token)
    return redirect_response

@router.get("/google/login")
def google_login():
    state = generate_oauth_state("google")
    if not settings.GOOGLE_CLIENT_ID:
        return {"url": f"{settings.FRONTEND_URL}/login?status=google_mock&state={state}"}

    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20profile%20email&"
        f"state={state}"
    )
    return {"url": google_auth_url}

@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={error}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

    if not state or not verify_oauth_state(state, "google"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れの認証リクエスト(state)です"
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="認可コード(code)が指定されていません"
        )

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth2 が設定されていません (GOOGLE_CLIENT_ID / SECRET が未設定です)"
        )

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        try:
            token_res = await client.post(token_url, data=token_data)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google トークン取得リクエストに失敗しました: {exc}"
            )

        if token_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google トークン交換に失敗しました: {token_res.text}"
            )

        token_json = token_res.json()
        access_token = token_json.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google access_token が取得できませんでした"
            )

        try:
            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google ユーザー情報リクエストに失敗しました: {exc}"
            )

        if user_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google ユーザー情報の取得に失敗しました: {user_res.text}"
            )

        user_data = user_res.json()

    google_user_id = str(user_data["id"])
    name = user_data.get("name") or "Google User"
    email = user_data.get("email") or ""
    picture = user_data.get("picture")

    stmt = (
        select(AccountIdentity)
        .options(selectinload(AccountIdentity.account).selectinload(Account.links))
        .where(
            AccountIdentity.provider == "google",
            AccountIdentity.provider_user_id == google_user_id
        )
    )
    res = await db.execute(stmt)
    identity = res.scalars().first()

    if identity and identity.account:
        account = identity.account
        account.last_login_at = datetime.datetime.utcnow()
        if picture and not account.avatar_url:
            account.avatar_url = picture
    else:
        base_username = email.split("@")[0] if "@" in email else name
        new_username = await generate_unique_username(db, base_username)
        account = Account(
            username=new_username,
            display_name=name[:64],
            avatar_url=picture,
            last_login_at=datetime.datetime.utcnow(),
        )
        db.add(account)
        await db.flush()

        identity = AccountIdentity(
            account_id=account.id,
            provider="google",
            provider_user_id=google_user_id,
            provider_username=email or name
        )
        db.add(identity)

    await db.commit()
    await db.refresh(account)

    session = await create_user_session(db, account.id, request)

    redirect_response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/settings",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT
    )
    set_auth_cookie(redirect_response, session.session_token)
    return redirect_response


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if token:
        await delete_user_session(db, token)

    is_production = settings.APP_ENV == "production"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        domain=".linkord.net" if is_production else None,
    )
    return {"status": "ok", "message": "ログアウトしました"}

@router.post("/delete-account")
async def delete_account(
    response: Response,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.deleted_at = datetime.datetime.utcnow()
    # Delete all active sessions
    from app.models.models import UserSession
    stmt = select(UserSession).where(UserSession.account_id == current_user.id)
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    for s in sessions:
        await db.delete(s)

    await db.commit()
    is_production = settings.APP_ENV == "production"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        domain=".linkord.net" if is_production else None,
    )
    return {"status": "ok", "message": "退会処理が完了しました"}

