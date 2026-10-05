import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine

@pytest.mark.asyncio
async def test_media_upload_flow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Dev login
        login_res = await client.post("/api/auth/dev-login")
        assert login_res.status_code == 200

        # 2. Upload valid PNG image
        # PNG signature: 89 50 4E 47 0D 0A 1A 0A
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
        files = {"file": ("test.png", io.BytesIO(dummy_png), "image/png")}
        upload_res = await client.post("/api/media/upload", files=files)
        assert upload_res.status_code == 200
        data = upload_res.json()
        assert "url" in data
        assert data["url"].startswith("/uploads/")
        filename = data["filename"]

        # 3. Test static file access
        static_res = await client.get(data["url"])
        assert static_res.status_code == 200
        assert static_res.content == dummy_png

        # 4. Delete file
        del_res = await client.delete(f"/api/media/{filename}")
        assert del_res.status_code == 200

        # 5. Verify deleted
        static_del_res = await client.get(data["url"])
        assert static_del_res.status_code == 404

        # 6. Reject invalid non-image file
        bad_file = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00ThisIsNotAnImage"), "application/octet-stream")}
        bad_res = await client.post("/api/media/upload", files=bad_file)
        assert bad_res.status_code == 400
