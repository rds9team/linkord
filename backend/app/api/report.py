from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import Report
from app.schemas.schemas import ReportCreate

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("")
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    report = Report(
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        status="pending"
    )
    db.add(report)
    await db.commit()
    return {"status": "ok", "message": "通報を受け付けました。管理者が内容を確認します。"}
