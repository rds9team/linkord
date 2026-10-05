import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Server, Boost, Account
from app.schemas.schemas import ServerOut, ServerCreate

router = APIRouter(prefix="/servers", tags=["servers"])

@router.get("", response_model=list[ServerOut])
async def list_servers(
    tag: str = Query(None),
    sort: str = Query("popular"), # popular, new, small
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.is_public == True)
    if tag:
        stmt = stmt.where(Server.tags.contains(tag))
        
    if sort == "new":
        stmt = stmt.order_by(Server.created_at.desc())
    elif sort == "small":
        stmt = stmt.order_by(Server.member_count.asc())
    else:
        stmt = stmt.order_by(Server.member_count.desc())
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{slug}", response_model=ServerOut)
async def get_server(slug: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Server).where(Server.slug == slug, Server.is_public == True)
    result = await db.execute(stmt)
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server

@router.post("/{server_id}/boost")
async def boost_server(server_id: int, db: AsyncSession = Depends(get_db)):
    # 1 hour window check: "YYYY-MM-DD-HH" (spec.md 454)
    now = datetime.datetime.utcnow()
    time_window = now.strftime("%Y-%m-%d-%H")
    
    # Mock user_id = 1 for dev
    user_id = 1
    
    # Check if already boosted in this window
    stmt = select(Boost).where(
        Boost.user_id == user_id,
        Boost.server_id == server_id,
        Boost.time_window == time_window
    )
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=429, detail="このサーバーへのブーストは1時間に1回のみ可能です")
        
    new_boost = Boost(user_id=user_id, server_id=server_id, time_window=time_window)
    db.add(new_boost)
    await db.commit()
    return {"status": "ok", "message": "ブーストしました！"}
