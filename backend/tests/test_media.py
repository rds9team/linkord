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

        # 5. Test audio upload (WAV)
        # RIFF....WAVE
        dummy_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
        wav_files = {"file": ("bgm.wav", io.BytesIO(dummy_wav), "audio/wav")}
        wav_res = await client.post("/api/media/upload", files=wav_files)
        assert wav_res.status_code == 200
        wav_data = wav_res.json()
        assert wav_data["media_kind"] == "audio"
        assert wav_data["url"].endswith(".wav")

        # 5b. Test FLAC upload
        dummy_flac = b"fLaC\x00\x00\x00\x22\x10\x00\x10\x00\x00\x00\x00\x00\x00\x00"
        flac_files = {"file": ("bgm.flac", io.BytesIO(dummy_flac), "audio/flac")}
        flac_res = await client.post("/api/media/upload", files=flac_files)
        assert flac_res.status_code == 200
        flac_data = flac_res.json()
        assert flac_data["media_kind"] == "audio"
        assert flac_data["url"].endswith(".flac")

        # 5c. Test MP3 with ID3 header
        dummy_mp3 = b"ID3\x04\x00\x00\x00\x00\x00\x20TIT2\x00\x00\x00\x08\x00\x00\x03TestSong"
        mp3_files = {"file": ("track.mp3", io.BytesIO(dummy_mp3), "audio/mpeg")}
        mp3_res = await client.post("/api/media/upload", files=mp3_files)
        assert mp3_res.status_code == 200
        mp3_data = mp3_res.json()
        assert mp3_data["media_kind"] == "audio"
        assert mp3_data["url"].endswith(".mp3")

        # 5d. Test M4A audio upload
        dummy_m4a = b"\x00\x00\x00\x20ftypM4A \x00\x00\x00\x00M4A mp42isom\x00\x00\x00\x08mdat"
        m4a_files = {"file": ("music.m4a", io.BytesIO(dummy_m4a), "audio/x-m4a")}
        m4a_res = await client.post("/api/media/upload", files=m4a_files)
        assert m4a_res.status_code == 200
        m4a_data = m4a_res.json()
        assert m4a_data["media_kind"] == "audio"
        assert m4a_data["url"].endswith(".m4a")

        # 6. Test video upload (MP4 ftyp)
        dummy_mp4 = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free"
        mp4_files = {"file": ("bg.mp4", io.BytesIO(dummy_mp4), "video/mp4")}
        mp4_res = await client.post("/api/media/upload", files=mp4_files)
        assert mp4_res.status_code == 200
        mp4_data = mp4_res.json()
        assert mp4_data["media_kind"] == "video"
        assert mp4_data["url"].endswith(".mp4")

        # 7. Reject invalid non-media file (EXE)
        bad_file = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00ThisIsNotAnImage"), "application/octet-stream")}
        bad_res = await client.post("/api/media/upload", files=bad_file)
        assert bad_res.status_code == 400

        # 8. Reject dangerous php script disguised as audio
        bad_script = {"file": ("fake.mp3", io.BytesIO(b"<?php echo 'danger'; ?>"), "audio/mpeg")}
        script_res = await client.post("/api/media/upload", files=bad_script)
        assert script_res.status_code == 400

    # 9. Test IDOR prevention: User B cannot delete User A's avatar
    account_b, token_b = await create_test_account_and_session("victim_user")
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token_b}"}) as client_b:
        # Victim uploads avatar and sets it in profile
        files = {"file": ("avatar.png", io.BytesIO(dummy_png), "image/png")}
        up_res = await client_b.post("/api/media/upload", files=files)
        assert up_res.status_code == 200
        victim_fn = up_res.json()["filename"]
        victim_url = up_res.json()["url"]

        await client_b.patch("/api/profile/me", json={"avatar_url": victim_url})

    # Attacker tries to delete victim's avatar
    async with AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": f"Bearer {token}"}) as client_attacker:
        del_attempt = await client_attacker.delete(f"/api/media/{victim_fn}")
        assert del_attempt.status_code == 403
        assert "他のユーザーが使用中のメディアは削除できません" in del_attempt.json()["detail"]
