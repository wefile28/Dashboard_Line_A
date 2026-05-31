"""
Settings API router.
Manages shop details and LINE Notify configurations.
Secured with JWT-based administrator authorization.
Masks the sensitive line_token on read operations.
Includes backup, restore, and reset database endpoints for disaster recovery.
"""

import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlmodel import Session, select, col

from database import get_session, DATABASE_URL, engine
from models import StoreSetting, User, Transaction, Notification, Category
from auth import get_current_user
from services.line_notify import send_notification
from services.seed_data import seed_all

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("")
def get_all_settings(session: Session = Depends(get_session)):
    """
    Get all application settings as a dictionary.
    Masks the line_token value for security.
    """
    settings = session.exec(select(StoreSetting)).all()
    settings_dict = {s.key: s.value for s in settings}

    # Mask sensitive LINE Notify token if populated
    if "line_token" in settings_dict and settings_dict["line_token"].strip():
        settings_dict["line_token"] = "********"
    else:
        settings_dict["line_token"] = ""

    return settings_dict


@router.put("")
def update_settings(
    data: dict[str, str],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update application settings. Secured with administrator authorization.
    Safely ignores the masked "********" token to avoid overwriting real credentials.
    """
    updated_keys = []
    for key, value in data.items():
        # Do not overwrite with masked placeholder
        if key == "line_token" and value == "********":
            continue

        existing = session.exec(
            select(StoreSetting).where(col(StoreSetting.key) == key)
        ).first()

        if existing:
            existing.value = str(value)
            session.add(existing)
        else:
            session.add(StoreSetting(key=key, value=str(value)))
        updated_keys.append(key)

    session.commit()
    return {"detail": "อัปเดตการตั้งค่าสำเร็จ", "updated": updated_keys}


@router.post("/line/test")
async def test_line_notification(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Send a test LINE notification using the currently configured token.
    Secured with administrator authorization.
    """
    token_setting = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "line_token")
    ).first()

    if not token_setting or not token_setting.value.strip():
        raise HTTPException(
            status_code=400,
            detail="กรุณาตั้งค่า LINE Token ในส่วนของการตั้งค่าก่อนทำการทดสอบ"
        )

    test_message = (
        "\n🟢 [U-Dash Test] แจ้งเตือนทดสอบระบบ"
        "\n━━━━━━━━━━━━━━━━━━"
        "\n✅ เชื่อมต่อระบบแจ้งเตือน LINE สำเร็จ"
        "\n📊 ระบบพร้อมส่งรายงานยอดขายและรายจ่ายแล้ว"
        "\n━━━━━━━━━━━━━━━━━━"
    )

    result = await send_notification(token_setting.value, test_message)
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("detail", "ไม่สามารถส่งแจ้งเตือนได้")
        )

    return result


@router.get("/backup")
def backup_database(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Backup the SQLite database file.
    Secured with administrator authorization.
    Only supported for SQLite engines.
    """
    if not DATABASE_URL.startswith("sqlite"):
        raise HTTPException(
            status_code=400,
            detail="ระบบสำรองข้อมูลด้วยไฟล์รองรับเฉพาะฐานข้อมูลแบบโลคอล (SQLite) เท่านั้น"
        )
    
    db_file = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_file):
        raise HTTPException(
            status_code=404,
            detail="ไม่พบไฟล์ฐานข้อมูลระบบหลัก"
        )
    
    return FileResponse(
        path=db_file,
        filename="udash_backup.db",
        media_type="application/octet-stream"
    )


@router.post("/restore")
async def restore_database(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Restore the SQLite database file.
    Secured with administrator authorization.
    Only supported for SQLite engines.
    """
    if not DATABASE_URL.startswith("sqlite"):
        raise HTTPException(
            status_code=400,
            detail="ระบบกู้คืนข้อมูลด้วยไฟล์รองรับเฉพาะฐานข้อมูลแบบโลคอล (SQLite) เท่านั้น"
        )
        
    # Read the first 16 bytes to check SQLite file signature
    header = await file.read(16)
    if header != b"SQLite format 3\x00":
        raise HTTPException(
            status_code=400,
            detail="ไฟล์ที่อัปโหลดไม่ใช่ไฟล์ฐานข้อมูล SQLite ที่ถูกต้อง"
        )
    
    # Seek back to start of file
    await file.seek(0)
    
    db_file = DATABASE_URL.replace("sqlite:///", "")
    
    # Safely close connections and replace database
    try:
        # Dispose the database engine to unlock the file
        engine.dispose()
        
        # Write the uploaded file over the database file
        with open(db_file, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        return {"success": True, "message": "กู้คืนระบบฐานข้อมูลสำเร็จแล้ว!"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการเขียนทับฐานข้อมูล: {str(e)}"
        )


@router.post("/reset")
def reset_database(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Reset all database transactions and notifications to fresh seeded demo data.
    Secured with administrator authorization.
    """
    try:
        # Clean delete of all transactions, notifications, and categories
        # Note: We do NOT delete the User table to avoid deleting the logged-in admin!
        session.query(Transaction).delete()
        session.query(Notification).delete()
        session.query(Category).delete()
        session.commit()
        
        # Re-seed categories, transactions, settings and notifications
        seed_all(session)
        
        return {"success": True, "message": "รีเซ็ตข้อมูลและโหลดข้อมูลเดโมตัวอย่างใหม่สำเร็จแล้ว"}
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล: {str(e)}"
        )
