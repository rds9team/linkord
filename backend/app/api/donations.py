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

router = APIRouter(prefix="/donations", tags=["donations"])

async def notify_donation_discord(donation: Donation, donor_account: Optional[Account] = None):
    webhook_url = settings.DISCORD_DONATION_WEBHOOK_URL
    if not webhook_url:
        return

    donor_display = donation.donor_name
    if donor_account:
        donor_display = f"{donor_account.display_name} (@{donor_account.full_username})"

    embed = {
        "title": "💸 新しいPayPay支援が届きました！",
        "description": (
            f"**支援者**: {donor_display}\n"
            f"**送金リンク**: [PayPayで受け取る]({donation.paypay_url})\n"
            f"**パスコード**: `{donation.passcode or '設定なし'}`\n"
            f"**金額目安**: {f'¥{donation.amount:,}' if donation.amount else '未指定'}\n"
            f"**メッセージ**: {donation.message or 'なし'}\n\n"
            f"管理パネルから確認・バッジ付与を行ってください。"
        ),
        "color": 0xFF0033, # PayPay Red
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "footer": {
            "text": "Linkord Supporter Notification"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(webhook_url, json={"embeds": [embed]})
    except Exception:
        # Webhook failure should not block donation receipt
        pass

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
