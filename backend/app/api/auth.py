from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.core.security import generate_oauth_state, verify_oauth_state, generate_session_token
from app.models.models import Account, AccountIdentity

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/discord/login")
def discord_login():
    state = generate_oauth_state("discord")
    if not settings.DISCORD_CLIENT_ID:
        # Dev fallback URL if client id not set yet
        return {"url": f"{settings.FRONTEND_URL}/login?status=discord_mock&state={state}"}
    
    discord_auth_url = (
        f"https://discord.com/api/oauth2/authorize?"
        f"client_id={settings.DISCORD_CLIENT_ID}&"
        f"redirect_uri={settings.DISCORD_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=identify&"
        f"state={state}"
    )
    return {"url": discord_auth_url}

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

@router.post("/dev-login")
async def dev_login(response: Response, db: AsyncSession = Depends(get_db)):
    """Development helper for fast testing without configuring Discord/Google app keys"""
    stmt = select(Account).where(Account.username == "yuto")
    result = await db.execute(stmt)
    account = result.scalars().first()
    
    if not account:
        account = Account(
            username="yuto",
            display_name="yuto",
            bio="Fullstack Developer & Minecraft PvP Player. Building Linkord & Web projects.",
            theme_id="midnight",
            theme_mode="dark",
            has_discord_authed=True,
            has_founder=True,
            has_team=True,
            has_supporter=True,
            discord_id="123456789012345678"
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)

    session_id = generate_session_token()
    response.set_cookie(
        key="linkord_session",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=(settings.APP_ENV == "production")
    )
    return {"status": "ok", "user": {"id": account.id, "username": account.username}}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="linkord_session")
    return {"status": "ok"}
