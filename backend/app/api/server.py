import re
import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_current_user, get_client_ip
from app.models.models import Server, Boost, Account
from app.schemas.schemas import ServerOut, ServerCreate, ServerUpdate

router = APIRouter(prefix="/servers", tags=["servers"])

@router.get("/inspect-invite")
async def inspect_discord_invite(invite: str = Query(..., description="Discord invite URL or code")):
    raw_invite = invite.strip()
    match = re.search(r"(?:discord\.gg/|discord\.com/invite/)?([a-zA-Z0-9_-]+)$", raw_invite)
    if not match:
        raise HTTPException(status_code=400, detail="無効なDiscord招待URLまたはコードです")
    
    code = match.group(1)
    url = f"https://discord.com/api/v10/invites/{code}?with_counts=true"
    
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                guild = data.get("guild", {})
                guild_id = guild.get("id")
                icon_hash = guild.get("icon")
                icon_url = f"https://cdn.discordapp.com/icons/{guild_id}/{icon_hash}.png" if guild_id and icon_hash else None
                
                return {
                    "code": code,
                    "invite_url": f"https://discord.gg/{code}",
                    "guild_id": guild_id,
                    "name": guild.get("name"),
                    "description": guild.get("description") or "",
                    "icon_url": icon_url,
                    "member_count": data.get("approximate_member_count") or 0,
                    "presence_count": data.get("approximate_presence_count") or 0,
                }
            elif resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Discord招待が見つかりません。期限切れか無効な招待URLです")
            else:
                raise HTTPException(status_code=400, detail=f"Discord APIエラー: {resp.status_code}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Discord APIとの通信に失敗しました: {exc}")

async def get_server_boosts_count(db: AsyncSession, server_id: int) -> int:
    stmt = select(func.count(Boost.id)).where(Boost.server_id == server_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

@router.get("", response_model=list[ServerOut])
async def list_servers(
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    sort: str = Query("popular"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.is_public == True)
    if tag:
        stmt = stmt.where(Server.tags.contains(tag))
    if language:
        stmt = stmt.where(Server.language == language)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Server.name.ilike(search_filter),
                Server.description.ilike(search_filter),
                Server.tags.ilike(search_filter)
            )
        )

    if sort == "new":
        stmt = stmt.order_by(Server.created_at.desc())
    elif sort == "small":
        stmt = stmt.order_by(Server.member_count.asc())
    else:
        stmt = stmt.order_by(Server.member_count.desc())

    result = await db.execute(stmt)
    servers = result.scalars().all()
    for s in servers:
        s.boosts_count = await get_server_boosts_count(db, s.id)
    return servers

@router.post("", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
async def create_server(
    data: ServerCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not re.match(r"^[a-zA-Z0-9_-]{3,48}$", data.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サーバーslugは3〜48文字の英数字・ハイフン・アンダースコアで入力してください"
        )

    stmt = select(Server).where(Server.slug == data.slug)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="指定されたサーバーslugは既に使用されています"
        )

    # Validate invite & fetch real Discord server info
    member_count = 0
    real_icon_url = data.icon_url
    clean_invite = data.invite_url.strip()
    match = re.search(r"(?:discord\.gg/|discord\.com/invite/)?([a-zA-Z0-9_-]+)$", clean_invite)
    if match:
        code = match.group(1)
        clean_invite = f"https://discord.gg/{code}"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                d_res = await client.get(f"https://discord.com/api/v10/invites/{code}?with_counts=true")
                if d_res.status_code == 200:
                    d_data = d_res.json()
                    member_count = d_data.get("approximate_member_count") or 0
                    guild = d_data.get("guild", {})
                    guild_id = guild.get("id")
                    icon_hash = guild.get("icon")
                    if guild_id and icon_hash and not real_icon_url:
                        real_icon_url = f"https://cdn.discordapp.com/icons/{guild_id}/{icon_hash}.png"
        except Exception:
            pass

    server = Server(
        owner_id=current_user.id,
        slug=data.slug,
        name=data.name,
        description=data.description,
        icon_url=real_icon_url,
        invite_url=clean_invite,
        tags=data.tags,
        language=data.language,
        member_count=member_count,
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)
    server.boosts_count = 0
    return server

@router.get("/{slug}", response_model=ServerOut)
async def get_server(slug: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Server).where(Server.slug == slug, Server.is_public == True)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server.boosts_count = await get_server_boosts_count(db, server.id)
    return server

@router.patch("/{slug}", response_model=ServerOut)
async def update_server(
    slug: str,
    data: ServerUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.slug == slug)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="このサーバーの編集権限がありません")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(server, field, val)

    server.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(server)
    server.boosts_count = await get_server_boosts_count(db, server.id)
    return server

@router.delete("/{slug}")
async def delete_server(
    slug: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.slug == slug)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="このサーバーの削除権限がありません")

    await db.delete(server)
    await db.commit()
    return {"status": "ok", "message": "サーバーを削除しました"}


@router.post("/{slug}/sync")
async def sync_server_discord_stats(
    slug: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.slug == slug)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="このサーバーの同期権限がありません")

    # Match invite code
    match = re.search(r"(?:discord\.gg/|discord\.com/invite/)?([a-zA-Z0-9_-]+)$", server.invite_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail="有効な招待コードが見つかりません")

    code = match.group(1)
    url = f"https://discord.com/api/v10/invites/{code}?with_counts=true"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                guild = data.get("guild", {})
                guild_id = guild.get("id")
                icon_hash = guild.get("icon")
                if guild_id and icon_hash:
                    server.icon_url = f"https://cdn.discordapp.com/icons/{guild_id}/{icon_hash}.png"
                if "approximate_member_count" in data:
                    server.member_count = data["approximate_member_count"]
                server.updated_at = datetime.datetime.utcnow()
                await db.commit()
                await db.refresh(server)
                server.boosts_count = await get_server_boosts_count(db, server.id)
                return {
                    "status": "ok",
                    "member_count": server.member_count,
                    "icon_url": server.icon_url,
                    "message": "Discordから最新のメンバー数とアイコンを同期しました"
                }
            else:
                raise HTTPException(status_code=400, detail="Discord招待情報の取得に失敗しました")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Discord APIとの通信に失敗しました: {exc}")

@router.post("/{identifier}/boost")
async def boost_server(
    identifier: str,
    request: Request,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Match by ID if numeric, else match by slug
    if identifier.isdigit():
        stmt = select(Server).where(Server.id == int(identifier))
    else:
        stmt = select(Server).where(Server.slug == identifier)

    res = await db.execute(stmt)
    server = res.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="対象のサーバーが見つかりません")

    now = datetime.datetime.utcnow()
    time_window = now.strftime("%Y-%m-%d-%H")

    check_stmt = select(Boost).where(
        Boost.user_id == current_user.id,
        Boost.server_id == server.id,
        Boost.time_window == time_window
    )

    check_res = await db.execute(check_stmt)
    if check_res.scalars().first():
        raise HTTPException(status_code=429, detail="このサーバーへのブーストは1時間に1回のみ可能です")

    new_boost = Boost(
        user_id=current_user.id,
        server_id=server.id,
        time_window=time_window
    )
    db.add(new_boost)
    await db.commit()
    return {"status": "ok", "message": f"{server.name} をブーストしました！"}

