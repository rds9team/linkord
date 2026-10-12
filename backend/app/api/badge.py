from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import html

from app.core.database import get_db
from app.models.models import Server

router = APIRouter(prefix="/badge", tags=["Dynamic Badge Widgets"])

def render_server_badge_svg(server_name: str, member_count: int, tags: str) -> str:
    """サーバーの動的埋め込みバッジSVG（依存関係ゼロ・超高解像度ベクター）を生成"""
    safe_name = html.escape(server_name if len(server_name) <= 22 else server_name[:21] + "…")
    initial = html.escape((server_name[0] if server_name else "L").upper())
    
    tag_str = ""
    if tags:
        tag_list = [html.escape(t.strip()) for t in tags.split(",") if t.strip()][:2]
        if tag_list:
            tag_str = " • ".join(f"#{t}" for t in tag_list)

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
  </defs>

  <!-- Card Background with Gradient Border -->
  <rect x="1" y="1" width="478" height="128" rx="20" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="2" />

  <!-- Server Icon Box -->
  <rect x="18" y="18" width="94" height="94" rx="16" fill="url(#iconGrad)" />
  <text x="65" y="74" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" text-anchor="middle" dominant-baseline="middle">{initial}</text>

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

@router.get("/{slug}.svg")
@router.get("/{slug}.png")
async def get_server_badge_widget(slug: str, db: AsyncSession = Depends(get_db)):
    """ブログやWiki、Discord用リアルタイム埋め込みバッジSVG（ベクター対応で全画面鮮明）"""
    stmt = select(Server).where(Server.slug == slug)
    res = await db.execute(stmt)
    server = res.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="サーバーが見つかりません")

    svg_content = render_server_badge_svg(
        server_name=server.name,
        member_count=server.member_count,
        tags=server.tags or ""
    )

    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=180, s-maxage=360",
            "Content-Disposition": f'inline; filename="{slug}-badge.svg"'
        }
    )
