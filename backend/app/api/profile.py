import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_current_user, get_client_ip
from app.models.models import Account, ProfileBoost, Follow
from app.schemas.schemas import ProfileOut, ProfileUpdate, FollowUserOut, ProfileSearchResult

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/search", response_model=list[ProfileSearchResult])
async def search_profiles(
    q: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Account)
        .where(Account.is_public == True, Account.deleted_at.is_(None))
        .order_by(Account.views_count.desc())
        .limit(min(limit, 50))
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Account.username.ilike(term),
                Account.display_name.ilike(term),
                Account.bio.ilike(term)
            )
        )
    result = await db.execute(stmt)
    accounts = result.scalars().all()
    
    out = []
    for acc in accounts:
        followers = await get_followers_count(db, acc.id)
        out.append(ProfileSearchResult(
            username=acc.username,
            tag=acc.tag,
            display_name=acc.display_name,
            avatar_url=acc.avatar_url,
            bio=acc.bio,
            has_discord_authed=acc.has_discord_authed,
            has_supporter=acc.has_supporter,
            has_team=acc.has_team,
            has_founder=acc.has_founder,
            views_count=acc.views_count,
            followers_count=followers
        ))
    return out


async def get_account_boosts_count(db: AsyncSession, account_id: int) -> int:
    stmt = select(func.count(ProfileBoost.id)).where(ProfileBoost.target_account_id == account_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

async def get_followers_count(db: AsyncSession, account_id: int) -> int:
    stmt = select(func.count(Follow.id)).where(Follow.following_id == account_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

async def get_following_count(db: AsyncSession, account_id: int) -> int:
    stmt = select(func.count(Follow.id)).where(Follow.follower_id == account_id)
    res = await db.execute(stmt)
    return res.scalar() or 0

async def check_is_following(db: AsyncSession, follower_id: int, following_id: int) -> bool:
    stmt = select(Follow.id).where(Follow.follower_id == follower_id, Follow.following_id == following_id)
    res = await db.execute(stmt)
    return res.scalars().first() is not None

async def find_account_by_identifier(db: AsyncSession, identifier: str) -> Optional[Account]:
    clean = identifier.strip()
    target_username = clean
    target_tag: Optional[str] = None

    if "#" in clean:
        parts = clean.split("#", 1)
        target_username = parts[0].strip().lower()
        target_tag = parts[1].strip()
    elif "-" in clean and len(clean.rsplit("-", 1)[1]) == 4 and clean.rsplit("-", 1)[1].isdigit():
        parts = clean.rsplit("-", 1)
        target_username = parts[0].strip().lower()
        target_tag = parts[1].strip()
    else:
        target_username = clean.lower()

    if target_tag:
        stmt = (
            select(Account)
            .options(selectinload(Account.links))
            .where(Account.username == target_username, Account.tag == target_tag)
        )
        res = await db.execute(stmt)
        return res.scalars().first()
    else:
        stmt = (
            select(Account)
            .options(selectinload(Account.links))
            .where(Account.username == target_username)
            .order_by(Account.id.asc())
        )
        res = await db.execute(stmt)
        return res.scalars().first()

@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.boosts_count = await get_account_boosts_count(db, current_user.id)
    current_user.followers_count = await get_followers_count(db, current_user.id)
    current_user.following_count = await get_following_count(db, current_user.id)
    current_user.is_following = False
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
    current_user.boosts_count = await get_account_boosts_count(db, current_user.id)
    current_user.followers_count = await get_followers_count(db, current_user.id)
    current_user.following_count = await get_following_count(db, current_user.id)
    current_user.is_following = False
    return current_user

@router.post("/{username}/follow")
async def toggle_follow_user(
    username: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Account).where(Account.username == username, Account.deleted_at.is_(None))
    result = await db.execute(stmt)
    target_account = result.scalars().first()
    if not target_account:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    if target_account.id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身をフォローすることはできません")

    # Check existing follow
    follow_stmt = select(Follow).where(
        Follow.follower_id == current_user.id,
        Follow.following_id == target_account.id
    )
    res = await db.execute(follow_stmt)
    existing_follow = res.scalars().first()

    if existing_follow:
        await db.delete(existing_follow)
        await db.commit()
        followers_count = await get_followers_count(db, target_account.id)
        return {
            "status": "unfollowed",
            "is_following": False,
            "followers_count": followers_count,
            "message": f"{target_account.display_name} さんのフォローを解除しました"
        }
    else:
        new_follow = Follow(follower_id=current_user.id, following_id=target_account.id)
        db.add(new_follow)
        await db.commit()
        followers_count = await get_followers_count(db, target_account.id)
        return {
            "status": "followed",
            "is_following": True,
            "followers_count": followers_count,
            "message": f"{target_account.display_name} さんをフォローしました"
        }

@router.get("/{username}/followers", response_model=list[FollowUserOut])
async def get_user_followers(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    target = (await db.execute(
        select(Account).where(Account.username == username, Account.deleted_at.is_(None))
    )).scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    stmt = (
        select(Account)
        .join(Follow, Follow.follower_id == Account.id)
        .where(Follow.following_id == target.id, Account.deleted_at.is_(None))
        .order_by(Follow.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{username}/following", response_model=list[FollowUserOut])
async def get_user_following(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    target = (await db.execute(
        select(Account).where(Account.username == username, Account.deleted_at.is_(None))
    )).scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    stmt = (
        select(Account)
        .join(Follow, Follow.following_id == Account.id)
        .where(Follow.follower_id == target.id, Account.deleted_at.is_(None))
        .order_by(Follow.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

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
async def get_profile(
    username: str,
    current_user: Optional[Account] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    account = await find_account_by_identifier(db, username)

    if not account:
        raise HTTPException(status_code=404, detail="Profile not found")

    if account.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="このアカウントは退会済みです")

    if not account.is_public:
        raise HTTPException(status_code=403, detail="This profile is private")

    account.views_count += 1
    await db.commit()
    await db.refresh(account)

    account.boosts_count = await get_account_boosts_count(db, account.id)
    account.followers_count = await get_followers_count(db, account.id)
    account.following_count = await get_following_count(db, account.id)
    if current_user:
        account.is_following = await check_is_following(db, current_user.id, account.id)
    else:
        account.is_following = False

    return account

@router.delete("/me")
async def delete_my_profile(
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.deleted_at = datetime.datetime.utcnow()
    await db.commit()
    return {"status": "ok", "message": "プロフィールを削除（退会）しました"}


