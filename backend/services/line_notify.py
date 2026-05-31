"""
LINE Notify integration service.
Provides asynchronous and synchronous wrappers to call the LINE Notify API,
featuring premium green/red alert templates for business transactions.
"""

import httpx

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"


async def send_notification(token: str, message: str) -> dict:
    """
    Asynchronously send a push message via the modern LINE Official Account (LINE OA) Messaging API.
    Expected token format: "CHANNEL_ACCESS_TOKEN;USER_OR_GROUP_ID"
    """
    if not token or not token.strip():
        return {"success": False, "detail": "LINE credentials ไม่ได้ตั้งค่า"}

    if ";" not in token:
        return {
            "success": False,
            "detail": "LINE Notify ปิดบริการแล้ว กรุณาใช้ฟอร์แมต LINE OA ใน .env: CHANNEL_ACCESS_TOKEN;USER_ID",
        }

    try:
        channel_access_token, to_id = token.split(";", 1)
        channel_access_token = channel_access_token.strip()
        to_id = to_id.strip()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {channel_access_token}",
        }
        payload = {
            "to": to_id,
            "messages": [
                {
                    "type": "text",
                    "text": message.strip()
                }
            ]
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(LINE_PUSH_URL, headers=headers, json=payload)

        if response.status_code == 200:
            return {"success": True, "detail": "ส่งแจ้งเตือนผ่าน LINE OA สำเร็จ"}
        elif response.status_code == 401:
            return {"success": False, "detail": "Channel Access Token ไม่ถูกต้องหรือหมดอายุ"}
        else:
            return {
                "success": False,
                "detail": f"LINE OA error: {response.status_code} - {response.text}",
            }
    except Exception as e:
        return {"success": False, "detail": f"ฟอร์แมต credentials ผิดพลาด: {str(e)}"}


def send_notification_sync(token: str, message: str) -> dict:
    """
    Synchronously send a push message via the modern LINE Official Account (LINE OA) Messaging API.
    Ideal for execution within FastAPI BackgroundTasks.
    Expected token format: "CHANNEL_ACCESS_TOKEN;USER_OR_GROUP_ID"
    """
    if not token or not token.strip():
        return {"success": False, "detail": "LINE credentials ไม่ได้ตั้งค่า"}

    if ";" not in token:
        return {
            "success": False,
            "detail": "LINE Notify ปิดบริการแล้ว กรุณาใช้ฟอร์แมต LINE OA ใน .env: CHANNEL_ACCESS_TOKEN;USER_ID",
        }

    try:
        channel_access_token, to_id = token.split(";", 1)
        channel_access_token = channel_access_token.strip()
        to_id = to_id.strip()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {channel_access_token}",
        }
        payload = {
            "to": to_id,
            "messages": [
                {
                    "type": "text",
                    "text": message.strip()
                }
            ]
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.post(LINE_PUSH_URL, headers=headers, json=payload)

        if response.status_code == 200:
            return {"success": True, "detail": "ส่งแจ้งเตือนผ่าน LINE OA สำเร็จ"}
        elif response.status_code == 401:
            return {"success": False, "detail": "Channel Access Token ไม่ถูกต้องหรือหมดอายุ"}
        else:
            return {
                "success": False,
                "detail": f"LINE OA error: {response.status_code} - {response.text}",
            }
    except Exception as e:
        return {"success": False, "detail": f"ฟอร์แมต credentials ผิดพลาด: {str(e)}"}


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
