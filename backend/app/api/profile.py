from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Account, SocialLink
from app.schemas.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

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
        
    # Increment views count
    account.views_count += 1
    await db.commit()
    await db.refresh(account)
    
    return account

@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    # Dev: target "yuto"
    stmt = (
        select(Account)
        .options(selectinload(Account.links))
        .where(Account.username == "yuto")
    )
    result = await db.execute(stmt)
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(account, field, val)

    await db.commit()
    await db.refresh(account)
    return account
