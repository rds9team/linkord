import re
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user
from app.models.models import Account, Server
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["media"])

from fastapi.responses import RedirectResponse
from app.services.image_cache import cache_and_compress_image

@router.get("/proxy")
async def proxy_image(url: str):
    """
    Discord CDNなどの画像をVPS内に圧縮・キャッシュし、ローカルURLへリダイレクト（i-FILTER対策）
    """
    if not url:
        raise HTTPException(status_code=400, detail="URLが指定されていません")

    # SSRF防止: Discord CDN または信頼できる画像URLのみ許可
    clean_url = url.strip()
    clean_lower = clean_url.lower()
    allowed = (
        "cdn.discordapp.com" in clean_lower
        or "media.discordapp.net" in clean_lower
    )
    if not allowed:
        raise HTTPException(status_code=400, detail="許可されていない画像ソースです")

    cached_url = await cache_and_compress_image(clean_url)
    if not cached_url:
        raise HTTPException(status_code=502, detail="画像の取得または圧縮に失敗しました")

    # ローカルURLへリダイレクト（ブラウザに長期間キャッシュさせる）
    return RedirectResponse(url=cached_url, status_code=307)

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user),
):
    url, filename, size, media_kind = await storage.save_file(file)
    return {
        "url": url,
        "filename": filename,
        "size": size,
        "media_kind": media_kind,
    }

@router.delete("/{filename}")
async def delete_media(
    filename: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ファイル名バリデーション（安全な英数字UUID＋拡張子のみ許可）
    if not re.match(r"^[a-zA-Z0-9_-]{1,64}\.[a-zA-Z0-9]{1,8}$", filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="無効なファイル名です")

    # 管理者判定
    admin_usernames = [u.strip().lower() for u in settings.get_admin_usernames()]
    is_admin = (
        current_user.username.lower() in admin_usernames
        or bool(current_user.has_founder)
        or bool(current_user.has_team)
    )

    if not is_admin:
        # 他人のアカウントまたは他人のサーバーで使用中のファイルをブロック (IDOR防止)
        target_url = f"/uploads/{filename}"

        # 1. 他のアカウントが使用中か確認
        other_acc_stmt = select(Account.id).where(
            Account.id != current_user.id,
            or_(
                Account.avatar_url == target_url,
                Account.background_url == target_url,
                Account.music_url == target_url,
                Account.video_url == target_url,
            )
        )
        other_acc_res = await db.execute(other_acc_stmt)
        if other_acc_res.scalars().first():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="他のユーザーが使用中のメディアは削除できません")

        # 2. 他人が所有するサーバーのアイコンとして使用中か確認
        other_srv_stmt = select(Server.id).where(
            Server.owner_id != current_user.id,
            Server.icon_url == target_url
        )
        other_srv_res = await db.execute(other_srv_stmt)
        if other_srv_res.scalars().first():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="他のユーザーが使用中のメディアは削除できません")

    success = storage.delete_file(filename)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ファイルが見つかりません")
    return {"status": "ok"}

