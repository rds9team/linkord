import datetime
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_optional_current_user
from app.models.models import Account, Donation
from app.schemas.schemas import DonationCreate, DonationOut
from app.services.discord_notify import notify_donation_discord

router = APIRouter(prefix="/donations", tags=["donations"])

@router.post("", response_model=DonationOut, status_code=status.HTTP_201_CREATED)
async def submit_donation(
    data: DonationCreate,
    current_user: Optional[Account] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    donor_name = "匿名"
    account_id = None
    donor_username = None
    donor_avatar = None

    if current_user:
        donor_name = current_user.display_name or current_user.username
        account_id = current_user.id
        donor_username = current_user.username
        donor_avatar = current_user.avatar_url

    donation = Donation(
        account_id=account_id,
        donor_name=donor_name,
        paypay_url=data.paypay_url,
        passcode=data.passcode,
        amount=data.amount,
        message=data.message,
        status="pending",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)

    await notify_donation_discord(donation, current_user)

    out = DonationOut.model_validate(donation)
    out.donor_username = donor_username
    out.donor_avatar = donor_avatar
    return out
