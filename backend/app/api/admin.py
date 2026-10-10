import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user
from app.models.models import Account, Server, Report, Donation
from app.schemas.schemas import ReportOut, ReportUpdate, AdminStatsOut, DonationOut, DonationResolve

router = APIRouter(prefix="/admin", tags=["admin"])

async def require_admin_user(current_user: Account = Depends(get_current_user)) -> Account:
    admin_usernames = settings.get_admin_usernames()
    if current_user.username not in admin_usernames:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限がありません"
        )
    return current_user

@router.get("/check")
async def check_admin_access(admin: Account = Depends(require_admin_user)):
    return {
        "status": "ok",
        "is_admin": True,
        "username": admin.username
    }

@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    users_count = (await db.execute(select(func.count(Account.id)).where(Account.deleted_at.is_(None)))).scalar() or 0
    servers_count = (await db.execute(select(func.count(Server.id)))).scalar() or 0
    total_reports = (await db.execute(select(func.count(Report.id)))).scalar() or 0
    pending_reports = (await db.execute(select(func.count(Report.id)).where(Report.status == "pending"))).scalar() or 0
    total_donations = (await db.execute(select(func.count(Donation.id)))).scalar() or 0
    pending_donations = (await db.execute(select(func.count(Donation.id)).where(Donation.status == "pending"))).scalar() or 0

    return AdminStatsOut(
        total_users=users_count,
        total_servers=servers_count,
        total_reports=total_reports,
        pending_reports=pending_reports,
        total_donations=total_donations,
        pending_donations=pending_donations
    )

@router.get("/reports", response_model=List[ReportOut])
async def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Report).order_by(Report.created_at.desc()).limit(min(limit, 100))
    if status_filter:
        stmt = stmt.where(Report.status == status_filter)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/reports/{report_id}", response_model=ReportOut)
async def update_report(
    report_id: int,
    data: ReportUpdate,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Report).where(Report.id == report_id)
    res = await db.execute(stmt)
    report = res.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="通報が見つかりません")

    if data.status is not None:
        report.status = data.status
        if data.status in ["resolved", "rejected"]:
            report.resolved_at = datetime.datetime.utcnow()
    if data.admin_note is not None:
        report.admin_note = data.admin_note

    await db.commit()
    await db.refresh(report)
    return report

@router.patch("/profiles/{username}/visibility")
async def toggle_profile_visibility(
    username: str,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Account).where(Account.username == username)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="対象ユーザーが見つかりません")

    target.is_public = not target.is_public
    await db.commit()
    return {
        "status": "ok",
        "username": target.username,
        "is_public": target.is_public,
        "message": f"{target.username} の公開状態を {'公開' if target.is_public else '非公開'} に変更しました"
    }

@router.patch("/servers/{slug}/visibility")
async def toggle_server_visibility(
    slug: str,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Server).where(Server.slug == slug)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="対象サーバーが見つかりません")

    target.is_public = not target.is_public
    await db.commit()
    return {
        "status": "ok",
        "slug": target.slug,
        "is_public": target.is_public,
        "message": f"{target.name} の公開状態を {'公開' if target.is_public else '非公開'} に変更しました"
    }

@router.get("/donations", response_model=List[DonationOut])
async def list_donations(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Donation)
        .options(selectinload(Donation.account))
        .order_by(Donation.created_at.desc())
        .limit(min(limit, 100))
    )
    if status_filter:
        stmt = stmt.where(Donation.status == status_filter)
    res = await db.execute(stmt)
    donations = res.scalars().all()

    out = []
    for d in donations:
        d_out = DonationOut.model_validate(d)
        if d.account:
            d_out.donor_username = d.account.username
            d_out.donor_avatar = d.account.avatar_url
        out.append(d_out)
    return out

@router.post("/donations/{donation_id}/resolve", response_model=DonationOut)
async def resolve_donation(
    donation_id: int,
    data: DonationResolve,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Donation)
        .options(selectinload(Donation.account))
        .where(Donation.id == donation_id)
    )
    res = await db.execute(stmt)
    donation = res.scalars().first()
    if not donation:
        raise HTTPException(status_code=404, detail="支援申請が見つかりません")

    if data.action == "approve":
        donation.status = "approved"
        donation.resolved_at = datetime.datetime.utcnow()
        if data.admin_note:
            donation.admin_note = data.admin_note
        # 紐付いているアカウントに Supporter バッジを付与
        if donation.account:
            donation.account.has_supporter = True
    elif data.action == "reject":
        donation.status = "rejected"
        donation.resolved_at = datetime.datetime.utcnow()
        if data.admin_note:
            donation.admin_note = data.admin_note

    await db.commit()
    await db.refresh(donation)

    d_out = DonationOut.model_validate(donation)
    if donation.account:
        d_out.donor_username = donation.account.username
        d_out.donor_avatar = donation.account.avatar_url
    return d_out
