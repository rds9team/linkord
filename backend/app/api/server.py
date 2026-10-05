import re
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_current_user, get_client_ip
from app.models.models import Server, Boost, Account
from app.schemas.schemas import ServerOut, ServerCreate

router = APIRouter(prefix="/servers", tags=["servers"])

async def get_server_boosts_count(db: AsyncSession, server_id: int) -> int:
    stmt = select(func.count(Boost.id)).where(Boost.server_id == server_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

@router.get("", response_model=list[ServerOut])
async def list_servers(
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("popular"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.is_public == True)
    if tag:
        stmt = stmt.where(Server.tags.contains(tag))
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

    server = Server(
        owner_id=current_user.id,
        slug=data.slug,
        name=data.name,
        description=data.description,
        invite_url=data.invite_url,
        tags=data.tags,
        language=data.language,
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

@router.post("/{identifier}/boost")
async def boost_server(
    identifier: str,
    request: Request,
    current_user: Optional[Account] = Depends(get_optional_current_user),
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
    client_ip = get_client_ip(request)

    if current_user:
        check_stmt = select(Boost).where(
            Boost.user_id == current_user.id,
            Boost.server_id == server.id,
            Boost.time_window == time_window
        )
    else:
        # Fallback to checking by IP if user is not logged in
        check_stmt = select(Boost).where(
            Boost.server_id == server.id,
            Boost.time_window == time_window
        )

    check_res = await db.execute(check_stmt)
    if check_res.scalars().first():
        raise HTTPException(status_code=429, detail="このサーバーへのブーストは1時間に1回のみ可能です")

    new_boost = Boost(
        user_id=current_user.id if current_user else server.owner_id,
        server_id=server.id,
        time_window=time_window
    )
    db.add(new_boost)
    await db.commit()
    return {"status": "ok", "message": f"{server.name} をブーストしました！"}
