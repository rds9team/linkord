import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_optional_current_user
from app.core.security import encrypt_token, is_safe_url
from app.models.models import Account, Donation
from app.schemas.schemas import DonationCreate, DonationOut, SupporterPublicOut
from app.services.discord_notify import notify_donation_discord

router = APIRouter(prefix="/donations", tags=["donations"])

@router.post("", response_model=DonationOut, status_code=status.HTTP_201_CREATED)
async def submit_donation(
    data: DonationCreate,
    current_user: Optional[Account] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not is_safe_url(data.paypay_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または安全でないPayPayリンクです"
        )

    donor_name = "匿名サポーター" if data.is_anonymous else "匿名"
    account_id = None
    donor_username = None
    donor_avatar = None

    if current_user:
        account_id = current_user.id
        if not data.is_anonymous:
            donor_name = current_user.display_name or current_user.username
            donor_username = current_user.username
            donor_avatar = current_user.avatar_url
        else:
            donor_name = "匿名サポーター"

    raw_passcode = data.passcode
    encrypted_passcode = encrypt_token(raw_passcode) if raw_passcode else None

    donation = Donation(
        account_id=account_id,
        donor_name=donor_name,
        paypay_url=data.paypay_url,
        passcode=encrypted_passcode,
        amount=data.amount,
        message=data.message,
        is_anonymous=data.is_anonymous,
        status="pending",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)

    # Discord通知用には一時的に平文パスコードを渡す
    donation_for_notify = donation
    donation_for_notify.passcode = raw_passcode
    await notify_donation_discord(donation_for_notify, current_user if not data.is_anonymous else None)

    out = DonationOut.model_validate(donation)
    out.passcode = raw_passcode
    out.donor_username = donor_username
    out.donor_avatar = donor_avatar
    return out

@router.get("/supporters", response_model=List[SupporterPublicOut])
async def list_public_supporters(db: AsyncSession = Depends(get_db)):
    """承認済みの支援者一覧（匿名支援でないものは名前・アイコンを表示）"""
    stmt = (
        select(Donation)
        .options(selectinload(Donation.account))
        .where(Donation.status == "approved")
        .order_by(Donation.created_at.desc())
        .limit(50)
    )
    res = await db.execute(stmt)
    donations = res.scalars().all()

    out = []
    for d in donations:
        name = "匿名サポーター" if d.is_anonymous else d.donor_name
        uname = None if d.is_anonymous else (d.account.username if d.account else None)
        avatar = None if d.is_anonymous else (d.account.avatar_url if d.account else None)
        out.append(SupporterPublicOut(
            id=d.id,
            donor_name=name,
            donor_username=uname,
            donor_avatar=avatar,
            amount=d.amount,
            message=d.message,
            created_at=d.created_at
        ))
    return out
