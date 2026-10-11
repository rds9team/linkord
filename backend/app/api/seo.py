import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Account, Server

router = APIRouter(prefix="/seo", tags=["seo"])

@router.get("/sitemap.xml")
async def generate_sitemap(db: AsyncSession = Depends(get_db)):
    """Google 検索クローラー向けの動的 XML サイトマップ"""
    now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    # 公開中のユーザーを取得
    users_stmt = select(Account.username).where(
        Account.is_public == True,
        Account.deleted_at.is_(None)
    ).limit(1000)
    users_res = await db.execute(users_stmt)
    usernames = users_res.scalars().all()

    # 公開中のサーバーを取得
    servers_stmt = select(Server.slug).where(Server.is_public == True).limit(1000)
    servers_res = await db.execute(servers_stmt)
    server_slugs = servers_res.scalars().all()

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        '    <loc>https://linkord.net/</loc>',
        f'    <lastmod>{now_str}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/discover</loc>',
        f'    <lastmod>{now_str}</lastmod>',
        '    <changefreq>hourly</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/terms</loc>',
        f'    <lastmod>{now_str}</lastmod>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.5</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://linkord.net/privacy</loc>',
        f'    <lastmod>{now_str}</lastmod>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.5</priority>',
        '  </url>',
    ]

    for uname in usernames:
        xml_lines.extend([
            '  <url>',
            f'    <loc>https://linkord.net/@{uname}</loc>',
            f'    <lastmod>{now_str}</lastmod>',
            '    <changefreq>daily</changefreq>',
            '    <priority>0.8</priority>',
            '  </url>',
        ])

    for slug in server_slugs:
        xml_lines.extend([
            '  <url>',
            f'    <loc>https://linkord.net/server/{slug}</loc>',
            f'    <lastmod>{now_str}</lastmod>',
            '    <changefreq>daily</changefreq>',
            '    <priority>0.8</priority>',
            '  </url>',
        ])

    xml_lines.append('</urlset>')
    xml_content = "\n".join(xml_lines)

    return Response(content=xml_content, media_type="application/xml")
