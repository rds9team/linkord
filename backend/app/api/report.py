from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import Report
from app.schemas.schemas import ReportCreate
from app.services.content_guard import check_content_safety

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("")
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    admin_note = None
    is_flagged, reasons = check_content_safety(f"{data.reason} {data.description or ''}")
    if is_flagged:
        admin_note = f"[Guard検知] {', '.join(reasons)}"

    report = Report(
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        admin_note=admin_note,
        status="pending"
    )
    db.add(report)
    await db.commit()
    return {"status": "ok", "message": "通報を受け付けました。管理者が内容を確認します。"}
