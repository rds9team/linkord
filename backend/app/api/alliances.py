from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Account, Server, ServerAlliance
from app.schemas.schemas import ServerAllianceCreate, ServerAllianceOut

router = APIRouter(prefix="/alliances", tags=["Server Alliances"])

@router.get("/server/{server_slug}", response_model=List[ServerAllianceOut])
async def get_server_alliances(server_slug: str, db: AsyncSession = Depends(get_db)):
    """サーバーの承認済み提携（同盟）一覧を取得"""
    server_stmt = select(Server).where(Server.slug == server_slug)
    res = await db.execute(server_stmt)
    server = res.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="サーバーが見つかりません")

    stmt = select(ServerAlliance).where(
        and_(
            ServerAlliance.status == "accepted",
            or_(
                ServerAlliance.server_a_id == server.id,
                ServerAlliance.server_b_id == server.id
            )
        )
    )
    alliances_res = await db.execute(stmt)
    alliances = alliances_res.scalars().all()

    result: List[ServerAllianceOut] = []
    for al in alliances:
        partner_id = al.server_b_id if al.server_a_id == server.id else al.server_a_id
        partner_stmt = select(Server).where(Server.id == partner_id)
        partner_res = await db.execute(partner_stmt)
        partner = partner_res.scalars().first()
        if partner:
            result.append(
                ServerAllianceOut(
                    id=al.id,
                    partner_server_id=partner.id,
                    partner_server_name=partner.name,
                    partner_server_slug=partner.slug,
                    partner_server_icon_url=partner.icon_url,
                    partner_server_member_count=partner.member_count,
                    partner_server_invite_url=partner.invite_url,
                    status=al.status,
                    created_at=al.created_at,
                )
            )
    return result

@router.post("/server/{my_server_slug}/request", status_code=status.HTTP_201_CREATED)
async def request_server_alliance(
    my_server_slug: str,
    data: ServerAllianceCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """サーバー同士の同盟提携をリクエスト（サーバーオーナーのみ）"""
    my_res = await db.execute(select(Server).where(Server.slug == my_server_slug))
    my_server = my_res.scalars().first()
    if not my_server:
        raise HTTPException(status_code=404, detail="自サーバーが見つかりません")

    if my_server.owner_id != current_user.id and not current_user.has_team:
        raise HTTPException(status_code=403, detail="サーバーのオーナーのみ提携申請できます")

    target_res = await db.execute(select(Server).where(Server.slug == data.target_server_slug))
    target_server = target_res.scalars().first()
    if not target_server:
        raise HTTPException(status_code=404, detail="提携先のサーバーが見つかりません")

    if my_server.id == target_server.id:
        raise HTTPException(status_code=400, detail="自身のサーバーと同盟を結ぶことはできません")

    # 既に申請または承認済みか確認
    existing_stmt = select(ServerAlliance).where(
        or_(
            and_(ServerAlliance.server_a_id == my_server.id, ServerAlliance.server_b_id == target_server.id),
            and_(ServerAlliance.server_a_id == target_server.id, ServerAlliance.server_b_id == my_server.id)
        )
    )
    existing_res = await db.execute(existing_stmt)
    existing = existing_res.scalars().first()
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="既に提携済みです")
        return {"message": "既に申請中または審査中です"}

    alliance = ServerAlliance(
        server_a_id=my_server.id,
        server_b_id=target_server.id,
        status="accepted", # コミュニティ活性化のため自動承認で相互掲載
        requested_by_id=current_user.id
    )
    db.add(alliance)
    await db.commit()
    return {"message": f"{target_server.name} と提携を締結しました！"}
