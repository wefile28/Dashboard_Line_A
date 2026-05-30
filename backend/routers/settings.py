"""
Settings API router.
Manages shop details and LINE Notify configurations.
Secured with JWT-based administrator authorization.
Masks the sensitive line_token on read operations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col

from database import get_session
from models import StoreSetting, User
from auth import get_current_user
from services.line_notify import send_notification

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
