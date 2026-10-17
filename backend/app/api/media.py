import re
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user, is_admin
from app.models.models import Account, MediaUpload
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["media"])

from fastapi.responses import RedirectResponse
from app.services.image_cache import cache_and_compress_image, is_allowed_image_source

@router.get("/proxy")
async def proxy_image(url: str):
    """
    Discord CDNなどの画像をVPS内に圧縮・キャッシュし、ローカルURLへリダイレクト（i-FILTER対策）
    """
    if not url:
        raise HTTPException(status_code=400, detail="URLが指定されていません")

    # SSRF防止: Discord CDN のホスト名と完全一致する https URL のみ許可
    clean_url = url.strip()
    if not is_allowed_image_source(clean_url):
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
    db: AsyncSession = Depends(get_db),
):
    url, filename, size, media_kind = await storage.save_file(file)
    db.add(MediaUpload(filename=filename, account_id=current_user.id))
    await db.commit()
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
    upload_res = await db.execute(select(MediaUpload).where(MediaUpload.filename == filename))
    upload = upload_res.scalars().first()

    # 自分がアップロードしたファイルのみ削除可能（所有者記録のない旧ファイルは管理者のみ）
    if not is_admin(current_user) and (not upload or upload.account_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="このメディアを削除する権限がありません")

    success = storage.delete_file(filename)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ファイルが見つかりません")
    if upload:
        await db.delete(upload)
        await db.commit()
    return {"status": "ok"}

