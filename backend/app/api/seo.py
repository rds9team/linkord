import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Account, Server

from xml.sax.saxutils import escape as xml_escape

router = APIRouter(prefix="/seo", tags=["seo"])

def format_w3c_date(dt: datetime.datetime | None) -> str:
    if not dt:
        return datetime.datetime.utcnow().strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")

@router.get("/sitemap.xml")
async def generate_sitemap(db: AsyncSession = Depends(get_db)):
    """Google 検索クローラー向けの動的 XML サイトマップ (W3C / Sitemaps 0.9 準拠)"""
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    # 公開中のユーザーを取得 (直近更新順)
    users_stmt = (
        select(Account.username, Account.updated_at, Account.created_at, Account.views_count)
        .where(
            Account.is_public == True,
            Account.deleted_at.is_(None)
        )
        .order_by(Account.updated_at.desc())
        .limit(2000)
    )
    users_res = await db.execute(users_stmt)
    users = users_res.all()

    # 公開中のサーバーを取得 (直近更新順)
    servers_stmt = (
        select(Server.slug, Server.updated_at, Server.created_at, Server.member_count)
        .where(Server.is_public == True)
        .order_by(Server.updated_at.desc())
        .limit(2000)
    )
    servers_res = await db.execute(servers_stmt)
    servers = servers_res.all()

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        '    <loc>https://linkord.net/</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/discover</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>hourly</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/discover?type=recruitments</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>hourly</changefreq>',
        '    <priority>0.95</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/discover?type=servers</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>hourly</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/discover?type=users</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>hourly</changefreq>',
        '    <priority>0.85</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/terms</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.3</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/privacy</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.3</priority>',
        '  </url>',
    ]

    for u in users:
        uname = xml_escape(str(u.username))
        lastmod = format_w3c_date(u.updated_at or u.created_at)
        views = getattr(u, "views_count", 0) or 0
        priority = "0.85" if views >= 50 else "0.8"
        xml_lines.extend([
            '  <url>',
            f'    <loc>https://linkord.net/@{uname}</loc>',
            f'    <lastmod>{lastmod}</lastmod>',
            '    <changefreq>daily</changefreq>',
            f'    <priority>{priority}</priority>',
            '  </url>',
        ])

    for s in servers:
        slug = xml_escape(str(s.slug))
        lastmod = format_w3c_date(s.updated_at or s.created_at)
        members = getattr(s, "member_count", 0) or 0
        priority = "0.85" if members >= 100 else "0.8"
        xml_lines.extend([
            '  <url>',
            f'    <loc>https://linkord.net/server/{slug}</loc>',
            f'    <lastmod>{lastmod}</lastmod>',
            '    <changefreq>daily</changefreq>',
            f'    <priority>{priority}</priority>',
            '  </url>',
        ])

    xml_lines.append('</urlset>')
    xml_content = "\n".join(xml_lines)

    return Response(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800, s-maxage=3600",
            "X-Content-Type-Options": "nosniff"
        }
    )
