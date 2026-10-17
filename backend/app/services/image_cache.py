import hashlib
import io
import os
import logging
from typing import Optional
from urllib.parse import urlparse
import httpx
from PIL import Image, ImageOps
try:
    from app.core.config import settings
    UPLOAD_DIR = settings.UPLOAD_DIR
except Exception:
    UPLOAD_DIR = os.getenv("UPLOAD_DIR") or os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(UPLOAD_DIR, "cached")
os.makedirs(CACHE_DIR, exist_ok=True)

# 取得を許可する画像ホスト（SSRF対策: 任意URLへのサーバー側リクエストを防ぐ）
ALLOWED_IMAGE_HOSTS = frozenset({"cdn.discordapp.com", "media.discordapp.net"})
MAX_SOURCE_BYTES = 10 * 1024 * 1024  # 10MB
Image.MAX_IMAGE_PIXELS = 40_000_000  # 解凍爆弾対策

def is_allowed_image_source(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    return parsed.scheme == "https" and (parsed.hostname or "").lower() in ALLOWED_IMAGE_HOSTS

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async def cache_and_compress_image(
    source_url: Optional[str],
    max_width: int = 512,
    max_height: int = 512,
    quality: int = 82
) -> Optional[str]:
    """
    Downloads an external image (Discord CDN, etc.), compresses it using Pillow,
    and stores it in the VPS uploads directory (/uploads/cached/...).
    Returns the relative URL (e.g. /uploads/cached/{hash}.webp).
    If it's already a local URL or download fails, gracefully returns the best URL.
    """
    if not source_url or not isinstance(source_url, str):
        return None

    clean_url = source_url.strip()
    if not clean_url:
        return None

    # Already stored on Linkord VPS
    if clean_url.startswith("/uploads/") or "linkord.net/uploads/" in clean_url or "api.linkord.net/uploads/" in clean_url:
        return clean_url

    # Discord CDN 以外は取得せず、そのまま返す
    if not is_allowed_image_source(clean_url):
        return clean_url

    # Generate a unique hash for caching
    url_hash = hashlib.sha256(clean_url.encode("utf-8")).hexdigest()[:24]
    target_filename = f"{url_hash}.webp"
    target_filepath = os.path.join(CACHE_DIR, target_filename)
    relative_url = f"/uploads/cached/{target_filename}"

    # Return cached version if already exists
    if os.path.exists(target_filepath) and os.path.getsize(target_filepath) > 0:
        return relative_url

    gif_filename = f"{url_hash}.gif"
    gif_filepath = os.path.join(CACHE_DIR, gif_filename)
    if os.path.exists(gif_filepath) and os.path.getsize(gif_filepath) > 0:
        return f"/uploads/cached/{gif_filename}"

    try:
        # リダイレクトは追わない（許可ホストから内部アドレスへ飛ばされるのを防ぐ）
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            async with client.stream("GET", clean_url, headers={"User-Agent": USER_AGENT}) as resp:
                if resp.status_code != 200:
                    return source_url
                chunks = []
                total = 0
                async for chunk in resp.aiter_bytes():
                    total += len(chunk)
                    if total > MAX_SOURCE_BYTES:
                        return source_url
                    chunks.append(chunk)
                raw_bytes = b"".join(chunks)
                if not raw_bytes:
                    return source_url

        img = Image.open(io.BytesIO(raw_bytes))

        # Check if animated GIF
        is_animated = getattr(img, "is_animated", False)
        if is_animated:
            with open(gif_filepath, "wb") as f:
                f.write(raw_bytes)
            return f"/uploads/cached/{gif_filename}"

        # Handle EXIF orientation
        img = ImageOps.exif_transpose(img)

        # Resize while maintaining aspect ratio
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # Handle transparency / colors
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        # Save compressed WebP
        temp_filepath = f"{target_filepath}.tmp"
        img.save(temp_filepath, format="WEBP", quality=quality, method=4)
        os.replace(temp_filepath, target_filepath)

        return relative_url

    except Exception as e:
        logger.warning(f"Failed to cache and compress image from {source_url}: {e}")
        return source_url
