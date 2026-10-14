import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.models.models import Announcement, Account
from app.schemas.schemas import AnnouncementOut, AnnouncementCreate
from app.api.admin import require_admin_user, log_audit_action

router = APIRouter(prefix="/announcements", tags=["announcements"])

@router.get("", response_model=List[AnnouncementOut])
async def list_announcements(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Announcement)
        .where(Announcement.is_active == True)
        .order_by(Announcement.created_at.desc())
        .limit(min(limit, 50))
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreate,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    announcement = Announcement(
        title=data.title.strip(),
        content=data.content.strip(),
        type=data.type.strip() if data.type else "info",
        link_url=data.link_url.strip() if data.link_url else None,
        is_active=True,
        created_at=datetime.datetime.utcnow()
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    await log_audit_action(
        db=db,
        admin_id=admin.id,
        action="create_announcement",
        target_type="announcement",
        target_id=announcement.id,
        details=f"タイトル: {announcement.title}"
    )
    await db.commit()

    return announcement

@router.get("/all", response_model=List[AnnouncementOut])
async def list_all_announcements_for_admin(
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """管理者用: 配信中・取り下げ済みを含む全お知らせ履歴一覧"""
    stmt = (
        select(Announcement)
        .order_by(Announcement.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/{announcement_id}/toggle", response_model=AnnouncementOut)
async def toggle_announcement_active(
    announcement_id: int,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """お知らせ削除（一般公開の終了/取り下げ）および再公開トグル"""
    stmt = select(Announcement).where(Announcement.id == announcement_id)
    res = await db.execute(stmt)
    announcement = res.scalars().first()
    if not announcement:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")

    announcement.is_active = not announcement.is_active
    action_name = "publish_announcement" if announcement.is_active else "unpublish_announcement"
    await log_audit_action(
        db=db,
        admin_id=admin.id,
        action=action_name,
        target_type="announcement",
        target_id=announcement_id,
        details=f"タイトル: {announcement.title} (公開状態: {announcement.is_active})"
    )
    await db.commit()
    await db.refresh(announcement)
    return announcement

@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """履歴削除: お知らせをDBおよび配信履歴から完全に抹消"""
    stmt = select(Announcement).where(Announcement.id == announcement_id)
    res = await db.execute(stmt)
    announcement = res.scalars().first()
    if not announcement:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")

    await db.delete(announcement)
    await log_audit_action(
        db=db,
        admin_id=admin.id,
        action="delete_announcement_history",
        target_type="announcement",
        target_id=announcement_id,
        details=f"履歴完全削除: {announcement.title}"
    )
    await db.commit()
    return {"status": "ok", "message": f"お知らせ #{announcement_id} の配信履歴を完全に削除しました"}
