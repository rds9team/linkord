import os
import uuid
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AUDIO_SIZE = 20 * 1024 * 1024  # 20MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

def detect_media_type(header: bytes) -> Optional[Tuple[str, str]]:
    """Detects media type from magic bytes/header. Returns (mime_type, media_kind) or None."""
    # Images
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "image"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "image"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "image/gif", "image"
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp", "image"
    # Audio - WAV
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return "audio/wav", "audio"
    # Audio - MP3 (ID3 header or sync word 0xFF 0xFB / 0xF3 / 0xF2)
    if header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
        return "audio/mpeg", "audio"
    # Audio / Video - OGG
    if header.startswith(b"OggS"):
        return "audio/ogg", "audio"
    # Video / Audio - WebM / MKV (EBML header 1A 45 DF A3)
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm", "video"
    # Video - MP4 (ftyp box: 4 bytes size, b"ftyp")
    if len(header) >= 12 and header[4:8] == b"ftyp":
        return "video/mp4", "video"
    return None

class LocalStorage:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile) -> Tuple[str, str, int, str]:
        content = await file.read()
        file_size = len(content)

        if file_size < 12:
            raise HTTPException(status_code=400, detail="Invalid file contents")

        detected = detect_media_type(content[:32])
        if not detected:
            raise HTTPException(
                status_code=400,
                detail="対応していないファイル形式です。画像 (JPEG, PNG, WebP, GIF), 音楽 (MP3, OGG, WAV), 背景動画 (MP4, WebM) のみアップロードできます。"
            )

        detected_mime, media_kind = detected

        if media_kind == "image":
            if file_size > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=400, detail="画像サイズが上限（10MB）を超えています")
            ext = ALLOWED_IMAGE_TYPES[detected_mime]
        elif media_kind == "audio":
            if file_size > MAX_AUDIO_SIZE:
                raise HTTPException(status_code=400, detail="音声ファイルサイズが上限（20MB）を超えています")
            ext = ALLOWED_AUDIO_TYPES[detected_mime]
        elif media_kind == "video":
            if file_size > MAX_VIDEO_SIZE:
                raise HTTPException(status_code=400, detail="動画ファイルサイズが上限（50MB）を超えています")
            ext = ALLOWED_VIDEO_TYPES[detected_mime]
        else:
            raise HTTPException(status_code=400, detail="無効なメディア形式です")

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(self.upload_dir, unique_filename)

        with open(target_path, "wb") as f:
            f.write(content)

        relative_url = f"/uploads/{unique_filename}"
        return relative_url, unique_filename, file_size, media_kind

    def delete_file(self, filename: str) -> bool:
        # Sanitize filename to avoid path traversal
        clean_name = os.path.basename(filename)
        target_path = os.path.join(self.upload_dir, clean_name)
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
                return True
            except OSError:
                return False
        return False

storage = LocalStorage(upload_dir=settings.UPLOAD_DIR)
