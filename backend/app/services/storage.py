import os
import uuid
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

def detect_image_type(header: bytes) -> Optional[str]:
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "image/gif"
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"
    return None

class LocalStorage:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile) -> Tuple[str, str, int]:
        content = await file.read()
        file_size = len(content)

        if file_size > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds maximum allowed (10MB)")

        if file_size < 12:
            raise HTTPException(status_code=400, detail="Invalid file contents")

        detected_mime = detect_image_type(content[:16])
        if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported or invalid image format. Allowed: JPEG, PNG, WebP, GIF")

        ext = ALLOWED_MIME_TYPES[detected_mime]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(self.upload_dir, unique_filename)

        with open(target_path, "wb") as f:
            f.write(content)

        relative_url = f"/uploads/{unique_filename}"
        return relative_url, unique_filename, file_size

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
