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
    "audio/flac": ".flac",
    "audio/x-m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/webm": ".weba",
    "audio/opus": ".opus",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AUDIO_SIZE = 60 * 1024 * 1024  # 60MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB

SAFE_AUDIO_EXTENSIONS = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/x-m4a",
    ".aac": "audio/aac",
    ".opus": "audio/opus",
    ".weba": "audio/webm",
}

DANGEROUS_PREFIXES = (
    b"<?php",
    b"<?",
    b"<!DOCTYPE",
    b"<!doctype",
    b"<html",
    b"<script",
    b"<svg",
    b"MZ",
    b"\x7fELF",
    b"#!",
)

def detect_media_type(header: bytes, filename: str = "", content_type: str = "") -> Optional[Tuple[str, str]]:
    """Detects media type from magic bytes/header and fallback heuristics. Returns (mime_type, media_kind) or None."""
    lower_fn = (filename or "").lower()
    lower_ct = (content_type or "").lower()

    # 1. Images
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "image"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "image"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "image/gif", "image"
    if (len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP") or lower_fn.endswith(".webp") or lower_ct == "image/webp":
        return "image/webp", "image"

    # 2. Audio - FLAC
    if header.startswith(b"fLaC"):
        return "audio/flac", "audio"

    # 3. Audio - WAV
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return "audio/wav", "audio"

    # 4. Audio - MP3 (ID3 header or sync word 0xFF 0xFB / 0xF3 / 0xF2)
    if header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
        return "audio/mpeg", "audio"

    # 5. Audio / Video - OGG
    if header.startswith(b"OggS"):
        return "audio/ogg", "audio"

    # 6. Audio - AAC ADTS (0xFF 0xF0..0xFF)
    if len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xF0) == 0xF0:
        return "audio/aac", "audio"

    # 7. Video / Audio - WebM / MKV (EBML header 1A 45 DF A3 or .webm extension)
    if header.startswith(b"\x1a\x45\xdf\xa3") or lower_fn.endswith(".webm") or lower_ct.startswith("video/webm"):
        if lower_fn.endswith(".weba") or "audio" in lower_ct:
            return "audio/webm", "audio"
        return "video/webm", "video"

    # 8. Video / Audio - MP4 / M4A (ftyp box: 4 bytes size, b"ftyp" or .mp4 extension)
    if (len(header) >= 12 and header[4:8] == b"ftyp") or lower_fn.endswith(".mp4") or lower_ct.startswith("video/mp4"):
        if lower_fn.endswith(".m4a") or lower_fn.endswith(".aac") or "audio" in lower_ct or b"M4A " in header[8:16]:
            return "audio/x-m4a", "audio"
        return "video/mp4", "video"

    # 9. Fallback heuristics for audio (relaxed validation while keeping safety)
    # Check if header contains dangerous script/executable signatures
    for dangerous in DANGEROUS_PREFIXES:
        if header.startswith(dangerous):
            return None

    # If filename has safe audio extension or content_type is audio/*
    ext = os.path.splitext(lower_fn)[1]
    if ext in SAFE_AUDIO_EXTENSIONS:
        return SAFE_AUDIO_EXTENSIONS[ext], "audio"

    if lower_ct.startswith("audio/"):
        for safe_mime, safe_ext in ALLOWED_AUDIO_TYPES.items():
            if lower_ct == safe_mime or lower_ct.split(";")[0] == safe_mime:
                return safe_mime, "audio"
        return "audio/mpeg", "audio"

    # Fallback for WebP / WebM images/videos
    if lower_fn.endswith(".webp") or lower_ct == "image/webp":
        return "image/webp", "image"
    if lower_fn.endswith(".webm") or lower_ct == "video/webm":
        return "video/webm", "video"

    return None

class LocalStorage:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile) -> Tuple[str, str, int, str]:
        # Read initial chunk for header inspection
        first_chunk = await file.read(8192)
        if len(first_chunk) < 8:
            raise HTTPException(status_code=400, detail="無効なファイル内容です")

        detected = detect_media_type(
            first_chunk,
            filename=file.filename or "",
            content_type=file.content_type or ""
        )
        if not detected:
            raise HTTPException(
                status_code=400,
                detail="対応していないファイル形式です。画像 (JPEG, PNG, WebP, GIF: 最大10MB), 音楽 (MP3, WAV, OGG, M4A, WebM: 最大60MB), 動画 (MP4, WebM: 最大100MB) のみアップロードできます。"
            )

        detected_mime, media_kind = detected

        if media_kind == "image":
            max_size = MAX_IMAGE_SIZE
            limit_msg = "画像サイズが上限（10MB）を超えています"
            ext = ALLOWED_IMAGE_TYPES.get(detected_mime, ".png" if "png" in detected_mime else (".webp" if "webp" in detected_mime else ".jpg"))
        elif media_kind == "audio":
            max_size = MAX_AUDIO_SIZE
            limit_msg = "音声ファイルサイズが上限（60MB）を超えています"
            ext = ALLOWED_AUDIO_TYPES.get(detected_mime, ".mp3")
        elif media_kind == "video":
            max_size = MAX_VIDEO_SIZE
            limit_msg = "動画ファイルサイズが上限（100MB）を超えています"
            ext = ALLOWED_VIDEO_TYPES.get(detected_mime, ".webm" if "webm" in detected_mime else ".mp4")
        else:
            raise HTTPException(status_code=400, detail="無効なメディア形式です")

        total_size = len(first_chunk)
        if total_size > max_size:
            raise HTTPException(status_code=400, detail=limit_msg)

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(self.upload_dir, unique_filename)

        try:
            with open(target_path, "wb") as f:
                f.write(first_chunk)
                while True:
                    chunk = await file.read(65536)  # 64KB chunk streaming
                    if not chunk:
                        break
                    total_size += len(chunk)
                    if total_size > max_size:
                        raise HTTPException(status_code=400, detail=limit_msg)
                    f.write(chunk)
        except Exception:
            if os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except OSError:
                    pass
            raise

        relative_url = f"/uploads/{unique_filename}"
        return relative_url, unique_filename, total_size, media_kind

    def delete_file(self, filename: str) -> bool:
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
