"""
LINE Notify integration service.
Provides asynchronous and synchronous wrappers to call the LINE Notify API,
featuring premium green/red alert templates for business transactions.
"""

import httpx

LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify"


async def send_notification(token: str, message: str) -> dict:
    """
    Asynchronously send a message via the LINE Notify API.
    """
    if not token or not token.strip():
        return {"success": False, "detail": "LINE token ไม่ได้ตั้งค่า"}

    headers = {"Authorization": f"Bearer {token}"}
    data = {"message": message}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(LINE_NOTIFY_URL, headers=headers, data=data)

        if response.status_code == 200:
            return {"success": True, "detail": "ส่งแจ้งเตือนสำเร็จ"}
        elif response.status_code == 401:
            return {"success": False, "detail": "LINE Token ไม่ถูกต้องหรือหมดอายุ"}
        else:
            return {
                "success": False,
                "detail": f"LINE API error: {response.status_code} - {response.text}",
            }
    except httpx.TimeoutException:
        return {"success": False, "detail": "หมดเวลาเชื่อมต่อ LINE API"}
    except httpx.RequestError as e:
        return {"success": False, "detail": f"ไม่สามารถเชื่อมต่อ LINE API: {str(e)}"}


def send_notification_sync(token: str, message: str) -> dict:
    """
    Synchronously send a message via the LINE Notify API.
    Ideal for execution within FastAPI BackgroundTasks.
    """
    if not token or not token.strip():
        return {"success": False, "detail": "LINE token ไม่ได้ตั้งค่า"}

    headers = {"Authorization": f"Bearer {token}"}
    data = {"message": message}

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(LINE_NOTIFY_URL, headers=headers, data=data)

        if response.status_code == 200:
            return {"success": True, "detail": "ส่งแจ้งเตือนสำเร็จ"}
        elif response.status_code == 401:
            return {"success": False, "detail": "LINE Token ไม่ถูกต้องหรือหมดอายุ"}
        else:
            return {
                "success": False,
                "detail": f"LINE API error: {response.status_code} - {response.text}",
            }
    except httpx.TimeoutException:
        return {"success": False, "detail": "หมดเวลาเชื่อมต่อ LINE API"}
    except httpx.RequestError as e:
        return {"success": False, "detail": f"ไม่สามารถเชื่อมต่อ LINE API: {str(e)}"}


def format_income_message(title: str, amount: float, tx_date: str) -> str:
    """
    Format a Thai income notification message with premium 🟢 design.
    """
    return (
        f"\n🟢 [รายรับเข้าใหม่] U-Dash Alert"
        f"\n━━━━━━━━━━━━━━━━━━"
        f"\n📝 รายการ: {title}"
        f"\n💰 ยอดเงิน: +{amount:,.2f} บาท"
        f"\n📅 วันที่: {tx_date}"
        f"\n━━━━━━━━━━━━━━━━━━"
    )


def format_expense_message(title: str, amount: float, tx_date: str) -> str:
    """
    Format a Thai expense notification message with premium 🔴 design.
    """
    return (
        f"\n🔴 [รายจ่ายออกใหม่] U-Dash Alert"
        f"\n━━━━━━━━━━━━━━━━━━"
        f"\n📝 รายการ: {title}"
        f"\n💸 ยอดเงิน: -{amount:,.2f} บาท"
        f"\n📅 วันที่: {tx_date}"
        f"\n━━━━━━━━━━━━━━━━━━"
    )


def format_daily_summary(
    income: float, expense: float, profit: float, summary_date: str
) -> str:
    """
    Format a Thai daily summary notification message.
    """
    trend_icon = "📈" if profit >= 0 else "📉"
    status_text = "🟢 กำไรสุทธิ" if profit >= 0 else "🔴 ขาดทุนสุทธิ"
    
    return (
        f"\n📊 [สรุปยอดรายวัน] ประจำวันที่ {summary_date}"
        f"\n━━━━━━━━━━━━━━━━━━"
        f"\n💰 รายรับรวม: {income:,.2f} บาท"
        f"\n💸 รายจ่ายรวม: {expense:,.2f} บาท"
        f"\n━━━━━━━━━━━━━━━━━━"
        f"\n{trend_icon} {status_text}: {profit:,.2f} บาท"
        f"\n━━━━━━━━━━━━━━━━━━"
    )
