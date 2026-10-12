import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Account, Server, VoiceRecruitment
from app.schemas.schemas import VoiceRecruitmentCreate, VoiceRecruitmentOut

router = APIRouter(prefix="/recruitments", tags=["Voice Recruitments"])

@router.get("", response_model=List[VoiceRecruitmentOut])
async def list_active_voice_recruitments(
    game: Optional[str] = Query(None, description="ゲームタグによる絞り込み"),
    db: AsyncSession = Depends(get_db)
):
    """現在アクティブな通話募集一覧を取得（有効期限内のもの）"""
    now = datetime.datetime.utcnow()
    
    # 期限切れの募集を非アクティブ化
    stmt = (
        select(VoiceRecruitment)
        .options(
            selectinload(VoiceRecruitment.server),
            selectinload(VoiceRecruitment.user)
        )
        .where(
            and_(
                VoiceRecruitment.is_active == True,
                VoiceRecruitment.expires_at > now
            )
        )
        .order_by(desc(VoiceRecruitment.created_at))
        .limit(50)
    )

    if game and game.strip():
        stmt = stmt.where(VoiceRecruitment.game_tag.ilike(f"%{game.strip()}%"))

    res = await db.execute(stmt)
    recruitments = res.scalars().all()

    result: List[VoiceRecruitmentOut] = []
    for r in recruitments:
        if not r.server or not r.user:
            continue
        result.append(
            VoiceRecruitmentOut(
                id=r.id,
                server_id=r.server_id,
                server_name=r.server.name,
                server_slug=r.server.slug,
                server_icon_url=r.server.icon_url,
                server_invite_url=r.server.invite_url,
                user_id=r.user_id,
                user_display_name=r.user.display_name,
                user_avatar_url=r.user.avatar_url,
                title=r.title,
                game_tag=r.game_tag,
                target_count=r.target_count,
                voice_channel_url=r.voice_channel_url or r.server.invite_url,
                is_active=r.is_active,
                expires_at=r.expires_at,
                created_at=r.created_at,
            )
        )
    return result

@router.post("", response_model=VoiceRecruitmentOut, status_code=status.HTTP_201_CREATED)
async def create_voice_recruitment(
    data: VoiceRecruitmentCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """新しいグローバル通話募集を作成（サーバーの招待リンクへ直結）"""
    # サーバーの存在確認
    server_stmt = select(Server).where(Server.id == data.server_id)
    server_res = await db.execute(server_stmt)
    server = server_res.scalars().first()
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたサーバーが見つかりません"
        )

    # ユーザーが同一サーバーで過去30分以内に作成した進行中の募集があるか確認（連投防止）
    now = datetime.datetime.utcnow()
    recent_stmt = select(VoiceRecruitment).where(
        and_(
            VoiceRecruitment.user_id == current_user.id,
            VoiceRecruitment.is_active == True,
            VoiceRecruitment.expires_at > now
        )
    )
    recent_res = await db.execute(recent_stmt)
    active_recruitments = recent_res.scalars().all()
    if len(active_recruitments) >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="同時に作成できる通話募集は最大3件までです。古い募集を終了してください。"
        )

    duration_hours = max(1, min(data.duration_hours, 6))
    expires_at = now + datetime.timedelta(hours=duration_hours)

    recruitment = VoiceRecruitment(
        server_id=server.id,
        user_id=current_user.id,
        title=data.title.strip(),
        game_tag=data.game_tag.strip() if data.game_tag else "雑談",
        target_count=data.target_count,
        voice_channel_url=data.voice_channel_url.strip() if data.voice_channel_url else server.invite_url,
        is_active=True,
        expires_at=expires_at,
        created_at=now,
    )
    db.add(recruitment)
    await db.commit()
    await db.refresh(recruitment)

    return VoiceRecruitmentOut(
        id=recruitment.id,
        server_id=server.id,
        server_name=server.name,
        server_slug=server.slug,
        server_icon_url=server.icon_url,
        server_invite_url=server.invite_url,
        user_id=current_user.id,
        user_display_name=current_user.display_name,
        user_avatar_url=current_user.avatar_url,
        title=recruitment.title,
        game_tag=recruitment.game_tag,
        target_count=recruitment.target_count,
        voice_channel_url=recruitment.voice_channel_url,
        is_active=recruitment.is_active,
        expires_at=recruitment.expires_at,
        created_at=recruitment.created_at,
    )

@router.delete("/{recruitment_id}", status_code=status.HTTP_200_OK)
async def close_voice_recruitment(
    recruitment_id: int,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """通話募集を終了（非アクティブ化）"""
    stmt = select(VoiceRecruitment).where(VoiceRecruitment.id == recruitment_id)
    res = await db.execute(stmt)
    recruitment = res.scalars().first()
    if not recruitment:
        raise HTTPException(status_code=404, detail="募集が見つかりません")

    # 作成者本人または管理者のみ終了可能
    if recruitment.user_id != current_user.id and not current_user.has_team:
        raise HTTPException(status_code=403, detail="権限がありません")

    recruitment.is_active = False
    await db.commit()
    return {"message": "通話募集を終了しました"}
