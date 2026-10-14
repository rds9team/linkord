import re
import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_current_user, get_client_ip
from app.models.models import Server, Boost, Account, AccountIdentity
from app.schemas.schemas import ServerOut, ServerCreate, ServerUpdate

from app.core.config import settings
from app.core.security import generate_oauth_state, decrypt_token

router = APIRouter(prefix="/servers", tags=["servers"])

@router.get("/my-guilds")
async def get_my_guilds(
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    def get_discord_auth_url() -> Optional[str]:
        if not settings.DISCORD_CLIENT_ID:
            return None
        state = generate_oauth_state("discord")
        return (
            f"https://discord.com/api/oauth2/authorize?"
            f"client_id={settings.DISCORD_CLIENT_ID}&"
            f"redirect_uri={settings.DISCORD_REDIRECT_URI}&"
            f"response_type=code&"
            f"scope=identify%20email%20guilds&"
            f"state={state}"
        )

    stmt = select(AccountIdentity).where(
        AccountIdentity.account_id == current_user.id,
        AccountIdentity.provider == "discord"
    )
    res = await db.execute(stmt)
    identity = res.scalars().first()

    auth_url = get_discord_auth_url()

    raw_token = decrypt_token(identity.access_token) if identity else None
    if not identity or not raw_token:
        return {
            "connected": False,
            "guilds": [],
            "auth_url": auth_url,
            "message": "Discordアカウントが連携されていないか、ギルド取得権限がありません。"
        }

    url = "https://discord.com/api/v10/users/@me/guilds"
    headers = {"Authorization": f"Bearer {raw_token}"}

    try:
        # すでに登録済みのギルドIDをマップ化
        reg_stmt = select(Server.guild_id, Server.slug).where(Server.guild_id.isnot(None))
        reg_res = await db.execute(reg_stmt)
        registered_map = {row[0]: row[1] for row in reg_res.all()}

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                guilds = []
                for g in data:
                    perms = int(g.get("permissions") or 0)
                    is_owner = bool(g.get("owner"))
                    can_manage = is_owner or bool(perms & 0x8) or bool(perms & 0x20)
                    
                    # オーナー権限または管理者権限（ADMINISTRATOR/MANAGE_GUILD）がないサーバーは除外
                    if not can_manage:
                        continue

                    gid = str(g.get("id"))
                    icon_hash = g.get("icon")
                    ext = "gif" if icon_hash and icon_hash.startswith("a_") else "png"
                    icon_url = f"https://cdn.discordapp.com/icons/{gid}/{icon_hash}.{ext}" if icon_hash else None

                    is_registered = gid in registered_map
                    guilds.append({
                        "id": gid,
                        "name": g.get("name"),
                        "icon_url": icon_url,
                        "owner": is_owner,
                        "can_manage": can_manage,
                        "permissions": perms,
                        "is_registered": is_registered,
                        "registered_slug": registered_map.get(gid) if is_registered else None,
                    })

                # ソート: オーナー優先 -> 名前順
                guilds.sort(key=lambda x: (not x["owner"], x["name"].lower()))

                return {
                    "connected": True,
                    "guilds": guilds,
                    "auth_url": auth_url,
                }
            elif resp.status_code == 401:
                return {
                    "connected": False,
                    "guilds": [],
                    "auth_url": auth_url,
                    "message": "Discordの認証セッションが失効しています。再度Discord連携を行ってください。"
                }
            else:
                return {
                    "connected": True,
                    "guilds": [],
                    "auth_url": auth_url,
                    "message": f"Discord APIエラー ({resp.status_code})"
                }
    except Exception as exc:
        return {
            "connected": True,
            "guilds": [],
            "auth_url": auth_url,
            "message": f"Discordギルド情報の通信に失敗しました: {exc}"
        }

@router.get("/inspect-invite")
async def inspect_discord_invite(invite: str = Query(..., max_length=256, description="Discord invite URL or code")):
    raw_invite = invite.strip()
    if len(raw_invite) > 256:
        raise HTTPException(status_code=400, detail="招待URLが長すぎます")
    clean = raw_invite.split("?")[0].split("#")[0].rstrip("/")
    match = re.search(r"(?:discord\.gg/|discord\.com/invite/)?([a-zA-Z0-9_-]+)$", clean)
    if not match:
        raise HTTPException(status_code=400, detail="無効なDiscord招待URLまたはコードです")
    
    code = match.group(1)
    if len(code) > 32:
        raise HTTPException(status_code=400, detail="無効な招待コードです")
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

@router.get("/bot-check/{guild_id}")
async def check_bot_installed(guild_id: str):
    """
    公式Botが指定ギルドに導入されているか確認し、
    サーバー基本情報および招待リンクを自動取得する。
    """
    clean_guild_id = guild_id.strip()
    if not clean_guild_id.isdigit() or not (17 <= len(clean_guild_id) <= 21):
        return {
            "installed": False,
            "message": "無効なサーバーIDです"
        }

    bot_token = settings.DISCORD_BOT_TOKEN
    if not bot_token:
        # トークン未設定環境時のフォールバック
        return {
            "installed": False,
            "message": "Botトークンが設定されていません"
        }

    headers = {"Authorization": f"Bot {bot_token}"}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            # 1. ギルド情報取得
            guild_url = f"https://discord.com/api/v10/guilds/{clean_guild_id}?with_counts=true"
            g_resp = await client.get(guild_url, headers=headers)
            if g_resp.status_code != 200:
                return {
                    "installed": False,
                    "message": "Botがまだこのサーバーに導入されていないか、確認できませんでした。"
                }

            g_data = g_resp.json()
            guild_name = g_data.get("name", "")
            icon_hash = g_data.get("icon")
            icon_url = f"https://cdn.discordapp.com/icons/{clean_guild_id}/{icon_hash}.png" if icon_hash else None
            member_count = g_data.get("approximate_member_count") or 0
            vanity_code = g_data.get("vanity_url_code")

            # 2. 招待リンクの取得・自動生成
            invite_url = f"https://discord.gg/{vanity_code}" if vanity_code else None

            # 既存の招待一覧を取得してみる
            if not invite_url:
                inv_resp = await client.get(f"https://discord.com/api/v10/guilds/{clean_guild_id}/invites", headers=headers)
                if inv_resp.status_code == 200:
                    inv_data = inv_resp.json()
                    if isinstance(inv_data, list) and len(inv_data) > 0:
                        invite_url = f"https://discord.gg/{inv_data[0].get('code')}"

            # 招待がない場合はチャンネルから無期限招待を新規作成
            if not invite_url:
                ch_resp = await client.get(f"https://discord.com/api/v10/guilds/{clean_guild_id}/channels", headers=headers)
                if ch_resp.status_code == 200:
                    channels = ch_resp.json()
                    text_channels = [c for c in channels if c.get("type") == 0]
                    target_ch = text_channels[0] if text_channels else (channels[0] if channels else None)
                    if target_ch and "id" in target_ch:
                        create_inv = await client.post(
                            f"https://discord.com/api/v10/channels/{target_ch['id']}/invites",
                            headers=headers,
                            json={"max_age": 0, "max_uses": 0, "unique": False}
                        )
                        if create_inv.status_code in (200, 201):
                            code = create_inv.json().get("code")
                            if code:
                                invite_url = f"https://discord.gg/{code}"

            return {
                "installed": True,
                "guild_id": clean_guild_id,
                "name": guild_name,
                "icon_url": icon_url,
                "member_count": member_count,
                "invite_url": invite_url or ""
            }
    except Exception as exc:
        return {
            "installed": False,
            "message": f"通信エラーが発生しました: {exc}"
        }

async def get_bot_invite_for_guild(guild_id: str) -> Optional[str]:
    """Botトークンを使って指定ギルドの有効な招待URLを取得・生成する"""
    clean_id = str(guild_id).strip()
    if not clean_id.isdigit():
        return None
    bot_token = settings.DISCORD_BOT_TOKEN
    if not bot_token:
        return None
    headers = {"Authorization": f"Bot {bot_token}"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            g_resp = await client.get(f"https://discord.com/api/v10/guilds/{clean_id}", headers=headers)
            if g_resp.status_code == 200:
                g_data = g_resp.json()
                vanity_code = g_data.get("vanity_url_code")
                if vanity_code:
                    return f"https://discord.gg/{vanity_code}"
            
            # 既存の招待一覧を取得
            inv_resp = await client.get(f"https://discord.com/api/v10/guilds/{clean_id}/invites", headers=headers)
            if inv_resp.status_code == 200:
                inv_data = inv_resp.json()
                if isinstance(inv_data, list) and len(inv_data) > 0:
                    code = inv_data[0].get("code")
                    if code:
                        return f"https://discord.gg/{code}"
            
            # 新規招待を作成
            ch_resp = await client.get(f"https://discord.com/api/v10/guilds/{clean_id}/channels", headers=headers)
            if ch_resp.status_code == 200:
                channels = ch_resp.json()
                text_channels = [c for c in channels if c.get("type") == 0]
                target_ch = text_channels[0] if text_channels else (channels[0] if channels else None)
                if target_ch and "id" in target_ch:
                    create_inv = await client.post(
                        f"https://discord.com/api/v10/channels/{target_ch['id']}/invites",
                        headers=headers,
                        json={"max_age": 0, "max_uses": 0, "unique": False}
                    )
                    if create_inv.status_code in (200, 201):
                        code = create_inv.json().get("code")
                        if code:
                            return f"https://discord.gg/{code}"
    except Exception:
        pass
    return None

async def check_server_manage_permission(server: Server, current_user: Optional[Account], db: AsyncSession) -> bool:
    """サーバーの所有者、またはDiscordギルドの管理者/所有者、またはLinkord運営ならTrueを返す"""
    if not current_user:
        return False
    if server.owner_id == current_user.id:
        return True
    if current_user.has_founder or current_user.has_team:
        return True
    
    # Discordギルドの管理者/所有者権限をチェック
    if server.guild_id:
        stmt = select(AccountIdentity).where(
            AccountIdentity.account_id == current_user.id,
            AccountIdentity.provider == "discord"
        )
        res = await db.execute(stmt)
        identity = res.scalars().first()
        if identity and identity.access_token:
            raw_token = decrypt_token(identity.access_token)
            if raw_token:
                try:
                    headers = {"Authorization": f"Bearer {raw_token}"}
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        resp = await client.get("https://discord.com/api/v10/users/@me/guilds", headers=headers)
                        if resp.status_code == 200:
                            guilds = resp.json()
                            for g in guilds:
                                if str(g.get("id")) == str(server.guild_id):
                                    perms = int(g.get("permissions", 0))
                                    is_owner = g.get("owner") is True
                                    has_admin = (perms & 0x8) != 0
                                    has_manage = (perms & 0x20) != 0
                                    if is_owner or has_admin or has_manage:
                                        return True
                except Exception:
                    pass
    return False

async def get_server_boosts_count(db: AsyncSession, server_id: int) -> int:
    stmt = select(func.count(Boost.id)).where(Boost.server_id == server_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

@router.get("", response_model=list[ServerOut])
async def list_servers(
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    min_members: Optional[int] = Query(None),
    max_members: Optional[int] = Query(None),
    sort: str = Query("popular"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.is_public == True)
    if tag:
        t = tag.strip()
        if t.lower() == "minecraft":
            stmt = stmt.where(or_(Server.tags.ilike("%minecraft%"), Server.minecraft_tags != ""))
        else:
            stmt = stmt.where(or_(Server.tags.contains(t), Server.minecraft_tags.contains(t)))
    if language:
        stmt = stmt.where(Server.language == language)
    if min_members is not None:
        stmt = stmt.where(Server.member_count >= min_members)
    if max_members is not None:
        stmt = stmt.where(Server.member_count <= max_members)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Server.name.ilike(search_filter),
                Server.description.ilike(search_filter),
                Server.tags.ilike(search_filter),
                Server.minecraft_tags.ilike(search_filter)
            )
        )

    if sort == "new":
        stmt = stmt.order_by(Server.created_at.desc())
    elif sort == "small":
        stmt = stmt.order_by(Server.member_count.asc())
    elif sort in ("bump", "up", "trending"):
        stmt = stmt.order_by(Server.updated_at.desc())
    else:
        stmt = stmt.order_by(Server.member_count.desc(), Server.updated_at.desc())

    result = await db.execute(stmt)
    servers = list(result.scalars().all())
    for s in servers:
        s.boosts_count = await get_server_boosts_count(db, s.id)

    if sort == "boost":
        servers.sort(key=lambda s: (s.boosts_count, s.updated_at), reverse=True)

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
    clean_code_src = clean_invite.split("?")[0].split("#")[0].rstrip("/")
    match = re.search(r"(?:discord\.gg/|discord\.com/invite/)?([a-zA-Z0-9_-]+)$", clean_code_src)
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

    target_guild_id = data.guild_id or (guild_id if 'guild_id' in locals() else None)
    if target_guild_id:
        # 重複掲載チェック
        dup_stmt = select(Server).where(Server.guild_id == str(target_guild_id))
        dup_res = await db.execute(dup_stmt)
        existing_srv = dup_res.scalars().first()
        if existing_srv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"このDiscordサーバーは既に掲載されています (slug: {existing_srv.slug})"
            )

        # ユーザーのDiscordアクセス権限（オーナーまたは管理者）を検証
        ident_stmt = select(AccountIdentity).where(
            AccountIdentity.account_id == current_user.id,
            AccountIdentity.provider == "discord"
        )
        ident_res = await db.execute(ident_stmt)
        identity = ident_res.scalars().first()

        if identity and identity.access_token:
            raw_token = decrypt_token(identity.access_token)
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    g_res = await client.get(
                        "https://discord.com/api/v10/users/@me/guilds",
                        headers={"Authorization": f"Bearer {raw_token}"}
                    )
                    if g_res.status_code == 200:
                        user_guilds = g_res.json()
                        matched = next((g for g in user_guilds if str(g.get("id")) == str(target_guild_id)), None)
                        if matched:
                            g_perms = int(matched.get("permissions") or 0)
                            is_owner = bool(matched.get("owner"))
                            has_admin = is_owner or bool(g_perms & 0x8) or bool(g_perms & 0x20)
                            if not has_admin:
                                raise HTTPException(
                                    status_code=status.HTTP_403_FORBIDDEN,
                                    detail="サーバーを掲載するには、該当Discordサーバーのオーナー権限または管理者権限（ADMINISTRATOR）が必要です"
                                )
                        else:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="指定されたサーバーに参加していないか、掲載権限（管理者またはオーナー）がありません"
                            )
            except HTTPException:
                raise
            except Exception:
                pass
        elif settings.APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="サーバーを掲載するには、Discordアカウントの連携が必要です"
            )

    target_tags = data.tags
    if data.minecraft_tags:
        tags_list = [t.strip() for t in (target_tags or "").split(",") if t.strip()]
        if not any(t.lower() == "minecraft" for t in tags_list):
            tags_list.append("Minecraft")
        target_tags = ",".join(tags_list)

    server = Server(
        owner_id=current_user.id,
        slug=data.slug,
        name=data.name,
        guild_id=target_guild_id,
        description=data.description,
        icon_url=real_icon_url,
        invite_url=clean_invite,
        tags=target_tags,
        minecraft_tags=data.minecraft_tags or "",
        language=data.language,
        member_count=member_count,
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)
    server.boosts_count = 0
    server.can_edit = True
    return server

@router.get("/{slug}/join")
async def join_server_via_bot(slug: str, db: AsyncSession = Depends(get_db)):
    """Botから最新の有効招待URLを取得してDiscord参加リンクへリダイレクト"""
    stmt = select(Server).where(Server.slug == slug)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    target_invite = None
    if server.guild_id:
        bot_invite = await get_bot_invite_for_guild(server.guild_id)
        if bot_invite:
            target_invite = bot_invite
            if server.invite_url != bot_invite:
                server.invite_url = bot_invite
                await db.commit()

    if not target_invite:
        target_invite = server.invite_url

    if not (target_invite.startswith("http://") or target_invite.startswith("https://")):
        target_invite = f"https://discord.gg/{target_invite}"

    return RedirectResponse(url=target_invite, status_code=307)

@router.get("/{slug}", response_model=ServerOut)
async def get_server(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Account] = Depends(get_optional_current_user)
):
    stmt = select(Server).where(Server.slug == slug, Server.is_public == True)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server.boosts_count = await get_server_boosts_count(db, server.id)
    server.can_edit = await check_server_manage_permission(server, current_user, db)
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

    can_edit = await check_server_manage_permission(server, current_user, db)
    if not can_edit:
        raise HTTPException(status_code=403, detail="このサーバーの編集権限がありません（サーバー所有者または管理者権限が必要です）")

    update_dict = data.model_dump(exclude_unset=True)
    
    # Minecraftタグが指定された場合、tagsにもMinecraftを含める
    if "minecraft_tags" in update_dict and update_dict["minecraft_tags"]:
        current_tags = [t.strip() for t in (update_dict.get("tags") or server.tags or "").split(",") if t.strip()]
        if not any(t.lower() == "minecraft" for t in current_tags):
            current_tags.append("Minecraft")
        update_dict["tags"] = ",".join(current_tags)

    for field, val in update_dict.items():
        setattr(server, field, val)

    server.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(server)
    server.boosts_count = await get_server_boosts_count(db, server.id)
    server.can_edit = True
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

    can_edit = await check_server_manage_permission(server, current_user, db)
    if not can_edit:
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

    can_edit = await check_server_manage_permission(server, current_user, db)
    if not can_edit:
        raise HTTPException(status_code=403, detail="このサーバーの同期権限がありません")

    # Botから最新招待を取得して同期
    if server.guild_id:
        bot_inv = await get_bot_invite_for_guild(server.guild_id)
        if bot_inv:
            server.invite_url = bot_inv

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

