import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine
from tests.conftest import create_test_account_and_session

@pytest.mark.asyncio
async def test_media_upload_flow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    account, token = await create_test_account_and_session("media_user")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token}"}) as client:
        # 1. Upload valid PNG image
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
        files = {"file": ("test.png", io.BytesIO(dummy_png), "image/png")}
        upload_res = await client.post("/api/media/upload", files=files)
        assert upload_res.status_code == 200
        data = upload_res.json()
        assert "url" in data
        assert data["url"].startswith("/uploads/")
        filename = data["filename"]

        # 2. Test static file access
        static_res = await client.get(data["url"])
        assert static_res.status_code == 200
        assert static_res.content == dummy_png

        # 3. Delete file
        del_res = await client.delete(f"/api/media/{filename}")
        assert del_res.status_code == 200

        # 4. Verify deleted
        static_del_res = await client.get(data["url"])
        assert static_del_res.status_code == 404

        # 5. Reject invalid non-image file
        bad_file = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00ThisIsNotAnImage"), "application/octet-stream")}
        bad_res = await client.post("/api/media/upload", files=bad_file)
        assert bad_res.status_code == 400
