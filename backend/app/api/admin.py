import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user, is_admin, is_super_admin
from app.core.security import decrypt_token
from app.models.models import Account, Server, Report, Donation, AuditLog
from app.schemas.schemas import (
    ReportOut,
    ReportUpdate,
    AdminStatsOut,
    DonationOut,
    DonationResolve,
    ManualSupporterCreate,
    AuditLogOut,
    BatchBadgesUpdate,
    BatchBadgesResult,
)

router = APIRouter(prefix="/admin", tags=["admin"])

async def log_audit_action(
    db: AsyncSession,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: str | int,
    details: Optional[str] = None
):
    audit = AuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details,
        created_at=datetime.datetime.utcnow()
    )
    db.add(audit)

async def require_admin_user(current_user: Account = Depends(get_current_user)) -> Account:
    if not is_admin(current_user):
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
    await log_audit_action(
        db, admin.id, "toggle_profile_visibility", "profile", username,
        f"is_public={'公開' if target.is_public else '非公開'}"
    )
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
    await log_audit_action(
        db, admin.id, "toggle_server_visibility", "server", slug,
        f"is_public={'公開' if target.is_public else '非公開'}"
    )
    await db.commit()
    return {
        "status": "ok",
        "slug": target.slug,
        "is_public": target.is_public,
        "message": f"{target.name} の公開状態を {'公開' if target.is_public else '非公開'} に変更しました"
    }

@router.patch("/profiles/{username}/badges")
async def update_profile_badges(
    username: str,
    has_supporter: Optional[bool] = None,
    has_team: Optional[bool] = None,
    has_founder: Optional[bool] = None,
    has_discord_authed: Optional[bool] = None,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Account).where(Account.username == username)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="対象ユーザーが見つかりません")

    changes = []
    if has_supporter is not None:
        target.has_supporter = has_supporter
        changes.append(f"supporter={has_supporter}")
    if has_team is not None:
        target.has_team = has_team
        changes.append(f"team={has_team}")
    if has_founder is not None:
        if not is_super_admin(admin):
            raise HTTPException(status_code=403, detail="Founderバッジの変更には最上位管理者権限が必要です")
        target.has_founder = has_founder
        changes.append(f"founder={has_founder}")
    if has_discord_authed is not None:
        target.has_discord_authed = has_discord_authed
        changes.append(f"discord_authed={has_discord_authed}")

    await log_audit_action(
        db, admin.id, "update_profile_badges", "profile", username,
        ", ".join(changes)
    )
    await db.commit()
    await db.refresh(target)
    return {
        "status": "ok",
        "username": target.username,
        "badges": {
            "has_discord_authed": target.has_discord_authed,
            "has_supporter": target.has_supporter,
            "has_team": target.has_team,
            "has_founder": target.has_founder,
        },
        "message": f"{target.username} のバッジ情報を更新しました"
    }

@router.post("/profiles/batch-badges", response_model=BatchBadgesResult)
async def batch_update_badges(
    data: BatchBadgesUpdate,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    if data.has_founder is not None:
        if not is_super_admin(admin):
            raise HTTPException(status_code=403, detail="Founderバッジの一括変更には最上位管理者権限が必要です")
    raw_names = [u.strip().lstrip("@") for u in data.usernames if u.strip()]
    unique_names = list(dict.fromkeys(raw_names))
    if not unique_names:
        raise HTTPException(status_code=400, detail="対象ユーザー名が指定されていません")

    updated_users = []
    not_found_users = []
    changes_desc = []
    if data.has_supporter is not None:
        changes_desc.append(f"supporter={data.has_supporter}")
    if data.has_team is not None:
        changes_desc.append(f"team={data.has_team}")
    if data.has_founder is not None:
        changes_desc.append(f"founder={data.has_founder}")
    if data.has_discord_authed is not None:
        changes_desc.append(f"discord_authed={data.has_discord_authed}")

    for name in unique_names:
        stmt = select(Account).where(Account.username == name.lower())
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            not_found_users.append(name)
            continue

        if data.has_supporter is not None:
            user.has_supporter = data.has_supporter
        if data.has_team is not None:
            user.has_team = data.has_team
        if data.has_founder is not None:
            user.has_founder = data.has_founder
        if data.has_discord_authed is not None:
            user.has_discord_authed = data.has_discord_authed

        updated_users.append(user.username)

    if updated_users:
        await log_audit_action(
            db, admin.id, "batch_update_badges", "profile", ", ".join(updated_users[:10]),
            f"count={len(updated_users)}, changes={', '.join(changes_desc)}"
        )
        await db.commit()

    return BatchBadgesResult(
        updated_count=len(updated_users),
        updated_users=updated_users,
        not_found_users=not_found_users,
        message=f"{len(updated_users)} 名のユーザーのバッジ情報を更新しました"
    )

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
        d_out.passcode = decrypt_token(d.passcode)
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

    await log_audit_action(
        db, admin.id, f"donation_{data.action}", "donation", donation_id,
        f"donor={donation.donor_name}, amount={donation.amount}, note={data.admin_note or ''}"
    )
    await db.commit()
    await db.refresh(donation)

    d_out = DonationOut.model_validate(donation)
    d_out.passcode = decrypt_token(donation.passcode)
    if donation.account:
        d_out.donor_username = donation.account.username
        d_out.donor_avatar = donation.account.avatar_url
    return d_out

@router.delete("/donations/{donation_id}")
async def delete_donation(
    donation_id: int,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Donation).where(Donation.id == donation_id)
    res = await db.execute(stmt)
    donation = res.scalars().first()
    if not donation:
        raise HTTPException(status_code=404, detail="支援申請が見つかりません")

    donor_info = f"donor={donation.donor_name}, amount={donation.amount}, status={donation.status}"
    await db.delete(donation)
    await log_audit_action(
        db, admin.id, "donation_delete", "donation", donation_id,
        donor_info
    )
    await db.commit()
    return {"status": "ok", "message": f"支援申請 #{donation_id} を削除しました"}

@router.post("/supporters", response_model=DonationOut)
async def create_manual_supporter(
    data: ManualSupporterCreate,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    account = None
    donor_name = data.donor_name or "サポーター"
    donor_username = None
    donor_avatar = None
    account_id = None

    if data.username:
        clean_uname = data.username.strip().lstrip("@")
        stmt = select(Account).where(Account.username == clean_uname)
        res = await db.execute(stmt)
        account = res.scalars().first()
        if account:
            account_id = account.id
            donor_username = account.username
            donor_avatar = account.avatar_url
            if not data.donor_name:
                donor_name = account.display_name or account.username
            account.has_supporter = True

    if data.is_anonymous:
        donor_name = "匿名サポーター"

    donation = Donation(
        account_id=account_id,
        donor_name=donor_name,
        paypay_url="https://linkord.net",
        passcode=None,
        amount=data.amount,
        message=data.message,
        is_anonymous=data.is_anonymous,
        status="approved",
        created_at=datetime.datetime.utcnow(),
        resolved_at=datetime.datetime.utcnow(),
        admin_note=f"管理画面から手動追加 (by {admin.username})"
    )
    db.add(donation)
    await log_audit_action(
        db, admin.id, "create_manual_supporter", "donation", donor_name,
        f"username={donor_username}, amount={data.amount}"
    )
    await db.commit()
    await db.refresh(donation)

    d_out = DonationOut.model_validate(donation)
    d_out.donor_username = donor_username
    d_out.donor_avatar = donor_avatar
    return d_out


@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    limit: int = 50,
    admin: Account = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.admin))
        .order_by(AuditLog.created_at.desc())
        .limit(min(limit, 100))
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    out = []
    for l in logs:
        log_out = AuditLogOut.model_validate(l)
        if l.admin:
            log_out.admin_username = l.admin.username
        out.append(log_out)
    return out
