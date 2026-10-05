import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_current_user, get_client_ip
from app.models.models import Account, ProfileBoost
from app.schemas.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    current_user: Account = Depends(get_current_user)
):
    return current_user

@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    data: ProfileUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(current_user, field, val)

    current_user.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/{username}/boost")
async def boost_profile(
    username: str,
    request: Request,
    current_user: Optional[Account] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Account)
        .where(Account.username == username, Account.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    target_account = result.scalars().first()
    if not target_account:
        raise HTTPException(status_code=404, detail="対象のプロフィールが見つかりません")

    if current_user and current_user.id == target_account.id:
        raise HTTPException(status_code=400, detail="自分自身のプロフィールはブーストできません")

    time_window = datetime.datetime.utcnow().strftime("%Y-%m-%d-%H")
    client_ip = get_client_ip(request)

    if current_user:
        check_stmt = select(ProfileBoost).where(
            ProfileBoost.user_id == current_user.id,
            ProfileBoost.target_account_id == target_account.id,
            ProfileBoost.time_window == time_window
        )
    else:
        check_stmt = select(ProfileBoost).where(
            ProfileBoost.ip_address == client_ip,
            ProfileBoost.target_account_id == target_account.id,
            ProfileBoost.time_window == time_window
        )

    check_res = await db.execute(check_stmt)
    if check_res.scalars().first():
        raise HTTPException(status_code=429, detail="このプロフィールへのブーストは1時間に1回のみ可能です")

    boost = ProfileBoost(
        user_id=current_user.id if current_user else None,
        target_account_id=target_account.id,
        ip_address=client_ip,
        time_window=time_window
    )
    db.add(boost)
    await db.commit()

    return {"status": "ok", "message": f"{target_account.display_name} をブーストしました！"}

@router.get("/{username}", response_model=ProfileOut)
async def get_profile(username: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Account)
        .options(selectinload(Account.links))
        .where(Account.username == username, Account.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not account.is_public:
        raise HTTPException(status_code=403, detail="This profile is private")

    account.views_count += 1
    await db.commit()
    await db.refresh(account)

    return account
