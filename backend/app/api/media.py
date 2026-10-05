from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.auth import get_current_user
from app.models.models import Account
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["media"])

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user),
):
    url, filename, size = await storage.save_file(file)
    return {
        "url": url,
        "filename": filename,
        "size": size,
    }

@router.delete("/{filename}")
def delete_media(
    filename: str,
    current_user: Account = Depends(get_current_user),
):
    success = storage.delete_file(filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"status": "ok"}
