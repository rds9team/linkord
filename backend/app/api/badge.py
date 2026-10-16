import re
import html
import base64
import time
from typing import Optional, Dict, Tuple
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import Server, Account, Follow

router = APIRouter(prefix="/badge", tags=["Dynamic Badge Widgets"])

# Simple in-memory cache for base64 image data: url -> (data_uri, timestamp)
_IMAGE_CACHE: Dict[str, Tuple[str, float]] = {}
CACHE_TTL = 3600  # 1 hour

async def fetch_image_data_uri(url: Optional[str]) -> Optional[str]:
    """外部またはローカルの画像URLを取得し、SVGインライン埋め込み可能なdata URIに変換"""
    if not url:
        return None

    clean_url = url.strip()
    # 相対パスの場合は本番ローカルAPI/アップロード扱い
    if clean_url.startswith("/uploads/"):
        clean_url = f"http://127.0.0.1:8085{clean_url}"

    if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
        return None

    now = time.time()
    if clean_url in _IMAGE_CACHE:
        cached_uri, timestamp = _IMAGE_CACHE[clean_url]
        if now - timestamp < CACHE_TTL:
            return cached_uri

    try:
        async with httpx.AsyncClient(timeout=3.5, follow_redirects=True) as client:
            resp = await client.get(clean_url)
            if resp.status_code == 200 and resp.content:
                content_type = resp.headers.get("content-type", "image/png").split(";")[0].strip()
                if not content_type.startswith("image/"):
                    content_type = "image/png"
                b64 = base64.b64encode(resp.content).decode("ascii")
                data_uri = f"data:{content_type};base64,{b64}"
                _IMAGE_CACHE[clean_url] = (data_uri, now)
                # Keep cache bounded
                if len(_IMAGE_CACHE) > 200:
                    oldest_key = min(_IMAGE_CACHE.keys(), key=lambda k: _IMAGE_CACHE[k][1])
                    _IMAGE_CACHE.pop(oldest_key, None)
                return data_uri
    except Exception:
        pass
    return None

def render_server_badge_svg(server_name: str, member_count: int, tags: str, icon_data_uri: str | None = None) -> str:
    """サーバーの動的埋め込みバッジSVG（base64アイコン内包・超鮮明ベクター）"""
    safe_name = html.escape(server_name if len(server_name) <= 22 else server_name[:21] + "…")
    initial = html.escape((server_name[0] if server_name else "L").upper())
    
    tag_str = ""
    if tags:
        tag_list = [html.escape(t.strip()) for t in tags.split(",") if t.strip()][:2]
        if tag_list:
            tag_str = " • ".join(f"#{t}" for t in tag_list)

    if icon_data_uri:
        safe_icon = html.escape(icon_data_uri)
        icon_element = f"""<image href="{safe_icon}" x="18" y="18" width="94" height="94" preserveAspectRatio="xMidYMid slice" clip-path="url(#iconClip)" />"""
    else:
        icon_element = f"""<text x="65" y="74" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" text-anchor="middle" dominant-baseline="middle">{initial}</text>"""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="480" height="130" viewBox="0 0 480 130" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="480" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0c0e17" />
      <stop offset="100%" stop-color="#141829" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0" y1="0" x2="480" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#9333ea" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.4" />
    </linearGradient>
    <linearGradient id="iconGrad" x1="16" y1="16" x2="104" y2="104" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#9333ea" />
    </linearGradient>
    <clipPath id="iconClip">
      <rect x="18" y="18" width="94" height="94" rx="16" />
    </clipPath>
  </defs>

  <!-- Card Background with Gradient Border -->
  <rect x="1" y="1" width="478" height="128" rx="20" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="2" />

  <!-- Server Icon Box -->
  <rect x="18" y="18" width="94" height="94" rx="16" fill="url(#iconGrad)" />
  {icon_element}

  <!-- Server Name -->
  <text x="128" y="44" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700">{safe_name}</text>

  <!-- Member Count Pill -->
  <rect x="128" y="58" width="130" height="26" rx="8" fill="#5865F2" fill-opacity="0.18" stroke="#5865F2" stroke-opacity="0.4" stroke-width="1" />
  <circle cx="140" cy="71" r="4" fill="#22c55e" />
  <text x="150" y="76" fill="#c7d2fe" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">{member_count:,} Members</text>

  <!-- Tags -->
  <text x="128" y="104" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">{tag_str}</text>

  <!-- Linkord Brand Badge -->
  <g transform="translate(370, 92)">
    <text x="0" y="12" fill="#a855f7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">⚡ linkord.net</text>
  </g>
</svg>"""

def render_user_badge_svg(display_name: str, username: str, bio: Optional[str], followers_count: int, views_count: int, avatar_data_uri: str | None = None) -> str:
    """ユーザーの動的埋め込みプロフィールバッジSVG"""
    safe_name = html.escape(display_name if len(display_name) <= 20 else display_name[:19] + "…")
    safe_username = html.escape(username)
    initial = html.escape((display_name[0] if display_name else username[0] if username else "U").upper())
    
    clean_bio = (bio or "").replace("\n", " ").strip()
    safe_bio = html.escape(clean_bio if len(clean_bio) <= 38 else clean_bio[:37] + "…")

    if avatar_data_uri:
        safe_avatar = html.escape(avatar_data_uri)
        avatar_element = f"""<image href="{safe_avatar}" x="18" y="18" width="94" height="94" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)" />"""
    else:
        avatar_element = f"""<text x="65" y="74" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" text-anchor="middle" dominant-baseline="middle">{initial}</text>"""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="480" height="130" viewBox="0 0 480 130" fill="none">
  <defs>
    <linearGradient id="userBgGrad" x1="0" y1="0" x2="480" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a0b12" />
      <stop offset="100%" stop-color="#121324" />
    </linearGradient>
    <linearGradient id="userBorderGrad" x1="0" y1="0" x2="480" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.5" />
    </linearGradient>
    <linearGradient id="avatarGrad" x1="16" y1="16" x2="104" y2="104" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="65" cy="65" r="47" />
    </clipPath>
  </defs>

  <!-- Card Background with Gradient Border -->
  <rect x="1" y="1" width="478" height="128" rx="20" fill="url(#userBgGrad)" stroke="url(#userBorderGrad)" stroke-width="2" />

  <!-- Avatar Circle -->
  <circle cx="65" cy="65" r="47" fill="url(#avatarGrad)" />
  {avatar_element}

  <!-- Display Name & Username -->
  <text x="128" y="40" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700">{safe_name}</text>
  <text x="128" y="58" fill="#a855f7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">@{safe_username}</text>

  <!-- Bio -->
  <text x="128" y="80" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="400">{safe_bio}</text>

  <!-- Stats: Followers & Views -->
  <g transform="translate(128, 96)">
    <rect x="0" y="0" width="84" height="22" rx="6" fill="#ffffff" fill-opacity="0.06" />
    <text x="8" y="15" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600">👥 {followers_count} フォロー</text>

    <rect x="92" y="0" width="76" height="22" rx="6" fill="#ffffff" fill-opacity="0.06" />
    <text x="100" y="15" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600">👁️ {views_count} 閲覧</text>
  </g>

  <!-- Linkord Brand Badge -->
  <g transform="translate(370, 96)">
    <text x="0" y="14" fill="#ec4899" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">⚡ linkord.net</text>
  </g>
</svg>"""

@router.get("/{slug}.svg")
@router.get("/{slug}.png")
async def get_server_badge_widget(slug: str, db: AsyncSession = Depends(get_db)):
    """ブログやWiki、Discord用リアルタイム埋め込みバッジSVG（base64アイコン内包）"""
    stmt = select(Server).where(Server.slug == slug)
    res = await db.execute(stmt)
    server = res.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="サーバーが見つかりません")

    icon_data_uri = await fetch_image_data_uri(server.icon_url)

    svg_content = render_server_badge_svg(
        server_name=server.name,
        member_count=server.member_count,
        tags=server.tags or "",
        icon_data_uri=icon_data_uri
    )

    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=180, s-maxage=360",
            "Content-Disposition": f'inline; filename="{slug}-badge.svg"'
        }
    )

@router.get("/user/{username}.svg")
@router.get("/user/{username}.png")
async def get_user_badge_widget(username: str, db: AsyncSession = Depends(get_db)):
    """ユーザープロフィールのリアルタイム埋め込みバッジSVG（ブログ・GitHub README用）"""
    clean_username = username.strip().lstrip("@")
    stmt = select(Account).where(
        Account.username.ilike(clean_username),
        Account.is_public == True,
        Account.deleted_at.is_(None)
    )
    res = await db.execute(stmt)
    account = res.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # フォロワー数取得
    follow_stmt = select(func.count(Follow.id)).where(Follow.following_id == account.id)
    follow_res = await db.execute(follow_stmt)
    followers_count = follow_res.scalar() or 0

    avatar_data_uri = await fetch_image_data_uri(account.avatar_url)

    svg_content = render_user_badge_svg(
        display_name=account.display_name or account.username,
        username=account.username,
        bio=account.bio,
        followers_count=followers_count,
        views_count=account.views_count or 0,
        avatar_data_uri=avatar_data_uri
    )

    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=180, s-maxage=360",
            "Content-Disposition": f'inline; filename="{account.username}-badge.svg"'
        }
    )
