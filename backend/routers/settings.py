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
from sqlmodel import Session, select, col, func

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
    Masks the line_token value for security and adds line_connected status.
    """
    settings = session.exec(select(StoreSetting)).all()
    settings_dict = {s.key: s.value for s in settings}

    # If not in database, attempt syncing from env immediately
    if "line_token" not in settings_dict or not settings_dict["line_token"].strip():
        import os
        env_token = os.getenv("LINE_NOTIFY_TOKEN", "")
        if env_token and env_token.strip():
            db_token = session.exec(
                select(StoreSetting).where(col(StoreSetting.key) == "line_token")
            ).first()
            if db_token:
                db_token.value = env_token.strip()
                session.add(db_token)
            else:
                session.add(StoreSetting(key="line_token", value=env_token.strip()))
            session.commit()
            settings_dict["line_token"] = env_token.strip()

    # Mask sensitive LINE Notify token if populated and append line_connected status for frontend
    if "line_token" in settings_dict and settings_dict["line_token"].strip():
        settings_dict["line_token"] = "********"
        settings_dict["line_connected"] = True
    else:
        settings_dict["line_token"] = ""
        settings_dict["line_connected"] = False

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

        # Validation for promptpay_id (Must be digits and either 10 or 13 characters long if provided)
        if key == "promptpay_id" and value.strip():
            val_clean = value.strip()
            if not val_clean.isdigit() or len(val_clean) not in [10, 13]:
                raise HTTPException(
                    status_code=400,
                    detail="หมายเลขพร้อมเพย์ต้องเป็นตัวเลขความยาว 10 หลัก (เบอร์มือถือ) หรือ 13 หลัก (เลขประจำตัวประชาชน) เท่านั้น"
                )

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


@router.post("/test-line")
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


@router.post("/line/daily-summary")
async def trigger_daily_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate and send today's financial summary directly to the configured LINE Notify channel.
    Secured with administrator authorization.
    """
    token_setting = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "line_token")
    ).first()

    if not token_setting or not token_setting.value.strip():
        raise HTTPException(
            status_code=400,
            detail="กรุณาตั้งค่า LINE Token ในส่วนของการตั้งค่าก่อนทำการส่งสรุปยอด"
        )

    from datetime import date
    from services.line_notify import format_daily_summary
    
    today = date.today()
    
    # Calculate today's income from database
    inc_statement = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        col(Transaction.type) == "income",
        col(Transaction.date) == today,
    )
    today_income = float(session.exec(inc_statement).one())
    
    # Calculate today's expense from database
    exp_statement = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        col(Transaction.type) == "expense",
        col(Transaction.date) == today,
    )
    today_expense = float(session.exec(exp_statement).one())
    
    today_profit = today_income - today_expense
    thai_date = today.strftime("%d/%m/%Y")
    
    # Format and push summary
    message = format_daily_summary(today_income, today_expense, today_profit, thai_date)
    result = await send_notification(token_setting.value, message)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("detail", "ไม่สามารถส่งสรุปยอดปิดร้านเข้า LINE ได้")
        )

    return {
        "success": True, 
        "message": "ส่งสรุปยอดรายวันเข้า LINE สำเร็จแล้ว!", 
        "data": {
            "income": today_income,
            "expense": today_expense,
            "profit": today_profit
        }
    }


@router.post("/line/shortage")
async def trigger_shortage_alert(
    data: dict[str, list[str]],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Send stock shortage notification directly to the configured LINE Notify channel.
    Secured with administrator authorization.
    """
    token_setting = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "line_token")
    ).first()

    if not token_setting or not token_setting.value.strip():
        raise HTTPException(
            status_code=400,
            detail="กรุณาตั้งค่า LINE Token ในส่วนของการตั้งค่าก่อนทำการส่งแจ้งเตือนวัตถุดิบหมด"
        )

    items = data.get("items", [])
    if not items:
        raise HTTPException(
            status_code=400,
            detail="กรุณาระบุรายการวัตถุดิบที่หมดอย่างน้อย 1 รายการ"
        )

    # Clean and remove empty items
    items = [item.strip() for item in items if item.strip()]
    if not items:
        raise HTTPException(
            status_code=400,
            detail="กรุณาระบุรายการวัตถุดิบที่หมดอย่างถูกต้อง"
        )

    items_list_str = "\n".join([f"• {item}" for item in items])
    
    # Get shop name
    shop_name_setting = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "shop_name")
    ).first()
    shop_name = shop_name_setting.value if shop_name_setting else "U-Dash"

    message = (
        f"\n🚨 [แจ้งเตือนวัตถุดิบหมด] ร้าน {shop_name}"
        "\n━━━━━━━━━━━━━━━━━━"
        "\n⚠️ ขณะนี้พบวัตถุดิบใกล้หมด/หมดสต็อก:"
        f"\n{items_list_str}"
        "\n━━━━━━━━━━━━━━━━━━"
        "\n💡 กรุณาจัดเตรียมสั่งซื้อวัตถุดิบเข้าร้านโดยด่วน"
    )

    result = await send_notification(token_setting.value, message)
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("detail", "ไม่สามารถส่งแจ้งเตือนวัตถุดิบหมดเข้า LINE ได้")
        )

    # Save system notification
    system_notification = Notification(
        message=f"แจ้งเตือนวัตถุดิบหมดเกลี้ยง {len(items)} รายการ ส่งเข้า LINE แล้ว",
        type="system"
    )
    session.add(system_notification)
    session.commit()

    return {"success": True, "message": "ส่งแจ้งเตือนวัตถุดิบหมดเข้า LINE สำเร็จแล้ว!"}


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
