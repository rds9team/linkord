import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import init_test_db, create_test_account_and_session

@pytest.mark.asyncio
async def test_seo_sitemap_xml():
    await init_test_db()
    acc, _ = await create_test_account_and_session("sitemap_test_user")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/seo/sitemap.xml")
        assert res.status_code == 200
        assert "application/xml" in res.headers.get("content-type", "")
        content = res.text
        assert "https://linkord.net/" in content
        assert "https://linkord.net/discover" in content
        assert "sitemap_test_user" in content
