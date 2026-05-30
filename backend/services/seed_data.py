"""
Seed data generator for the U-Dash Dashboard application.
Generates exactly 14 days of realistic Thai business demo data.
Seeds default categories, a default admin user, and app settings.
"""

import random
from datetime import date, datetime, timedelta
from sqlmodel import Session

from models import Category, Transaction, StoreSetting, Notification, User
from auth import hash_password

# ─── Default Categories ─────────────────────────────────────────────────────────

DEFAULT_CATEGORIES = [
    # Income categories
    {"name": "ขายสินค้า", "type": "income", "icon": "🛒", "color": "#22c55e"},
    {"name": "บริการ", "type": "income", "icon": "🔧", "color": "#3b82f6"},
    {"name": "รายได้อื่นๆ", "type": "income", "icon": "💎", "color": "#a855f7"},
    {"name": "ค่าคอมมิชชั่น", "type": "income", "icon": "🤝", "color": "#06b6d4"},
    # Expense categories
    {"name": "ค่าวัตถุดิบ", "type": "expense", "icon": "📦", "color": "#ef4444"},
    {"name": "ค่าเช่า", "type": "expense", "icon": "🏠", "color": "#f97316"},
    {"name": "ค่าน้ำ/ค่าไฟ", "type": "expense", "icon": "💡", "color": "#eab308"},
    {"name": "เงินเดือนพนักงาน", "type": "expense", "icon": "👥", "color": "#ec4899"},
    {"name": "ค่าขนส่ง", "type": "expense", "icon": "🚚", "color": "#8b5cf6"},
    {"name": "ค่าการตลาด", "type": "expense", "icon": "📣", "color": "#14b8a6"},
    {"name": "อื่นๆ", "type": "expense", "icon": "📝", "color": "#64748b"},
]

# ─── Transaction Templates for Realistic Generation ──────────────────────────────

INCOME_TEMPLATES = [
    {"title": "ขายสินค้าออนไลน์", "cat": "ขายสินค้า", "min": 800, "max": 15000},
    {"title": "ขายสินค้าหน้าร้าน", "cat": "ขายสินค้า", "min": 500, "max": 12000},
    {"title": "ขายสินค้าส่งล็อตใหญ่", "cat": "ขายสินค้า", "min": 3000, "max": 15000},
    {"title": "ค่าบริการดูแลลูกค้ารายเดือน", "cat": "บริการ", "min": 1000, "max": 8000},
    {"title": "ค่าบริการติดตั้งอุปกรณ์", "cat": "บริการ", "min": 500, "max": 5000},
    {"title": "ค่าที่ปรึกษาธุรกิจ", "cat": "บริการ", "min": 2000, "max": 10000},
    {"title": "รายได้ค่าโฆษณาสปอนเซอร์", "cat": "รายได้อื่นๆ", "min": 1000, "max": 5000},
    {"title": "ค่าคอมมิชชั่นแนะนำสินค้า", "cat": "ค่าคอมมิชชั่น", "min": 800, "max": 6000},
]

EXPENSE_TEMPLATES = [
    {"title": "ซื้อวัตถุดิบประกอบสินค้า", "cat": "ค่าวัตถุดิบ", "min": 500, "max": 8000},
    {"title": "สั่งผลิตแพ็กเกจจิ้งล็อตใหม่", "cat": "ค่าวัตถุดิบ", "min": 1000, "max": 8000},
    {"title": "ค่าเช่าสำนักงาน/หน้าร้าน", "cat": "ค่าเช่า", "min": 5000, "max": 8000},
    {"title": "ค่าเช่าเซิร์ฟเวอร์และซอฟต์แวร์", "cat": "ค่าเช่า", "min": 1500, "max": 4000},
    {"title": "ค่าน้ำประปา", "cat": "ค่าน้ำ/ค่าไฟ", "min": 200, "max": 800},
    {"title": "ค่าไฟฟ้าอาคารสำนักงาน", "cat": "ค่าน้ำ/ค่าไฟ", "min": 1200, "max": 4500},
    {"title": "ค่าอินเทอร์เน็ตความเร็วสูง", "cat": "ค่าน้ำ/ค่าไฟ", "min": 599, "max": 1200},
    {"title": "เงินเดือนแอดมินเพจ", "cat": "เงินเดือนพนักงาน", "min": 4500, "max": 8000},
    {"title": "ค่าจ้างฟรีแลนซ์ออกแบบกราฟิก", "cat": "เงินเดือนพนักงาน", "min": 1000, "max": 3000},
    {"title": "ค่าขนส่งพัสดุด่วน (EMS/Kerry)", "cat": "ค่าขนส่ง", "min": 200, "max": 2000},
    {"title": "ค่าน้ำมันรถขนส่งสินค้า", "cat": "ค่าขนส่ง", "min": 600, "max": 2500},
    {"title": "ยิงแอด Facebook Ads", "cat": "ค่าการตลาด", "min": 500, "max": 4000},
    {"title": "ลงโฆษณา TikTok Ads", "cat": "ค่าการตลาด", "min": 1000, "max": 5000},
    {"title": "ซื้ออุปกรณ์เครื่องเขียนสำนักงาน", "cat": "อื่นๆ", "min": 200, "max": 1500},
]

NOTES = [
    "ลูกค้าประจำ", "ลูกค้าใหม่", "ออเดอร์ด่วน", "ชำระเงินโอน", "ชำระเงินสด",
    "จ่ายผ่านบัตรเครดิต", "สั่งซื้อรอบบ่าย", "แถมของที่ระลึก", "", "", ""
]

# ─── Default Store Settings ───────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "shop_name": "ร้านค้า U-Dash Master",
    "line_token": "",
    "currency": "THB",
    "notification_enabled": "true",
}


def seed_admin_user(session: Session) -> None:
    """Create the initial administrator user."""
    admin_email = "admin@udash.com"
    existing = session.exec(User).where(User.email == admin_email).first()
    if not existing:
        admin = User(
            email=admin_email,
            hashed_password=hash_password("udash2026"),
            full_name="U-Dash Admin",
            is_active=True,
            created_at=datetime.utcnow()
        )
        session.add(admin)


def seed_categories(session: Session) -> dict[str, int]:
    """Seed categories and return name -> ID map."""
    cat_map = {}
    for cat_data in DEFAULT_CATEGORIES:
        existing = session.exec(
            Category
        ).where(Category.name == cat_data["name"], Category.type == cat_data["type"]).first()
        if not existing:
            cat = Category(**cat_data)
            session.add(cat)
            session.flush()
            cat_map[cat.name] = cat.id
        else:
            cat_map[existing.name] = existing.id
    return cat_map


def seed_transactions(session: Session, cat_map: dict[str, int]) -> None:
    """Generate 14 days of realistic transaction data (3-8 transactions per day)."""
    today = date.today()
    random.seed(2026)  # Deterministic seed for reproducible dashboard metrics

    for offset in range(14, 0, -1):
        tx_date = today - timedelta(days=offset)
        # Random number of transactions: 3 to 8
        num_tx = random.randint(3, 8)
        
        for i in range(num_tx):
            # Alternate income and expense
            is_income = random.choice([True, False])
            template = random.choice(INCOME_TEMPLATES) if is_income else random.choice(EXPENSE_TEMPLATES)
            
            amount = round(random.uniform(template["min"], template["max"]), 2)
            note = random.choice(NOTES)
            
            tx = Transaction(
                type="income" if is_income else "expense",
                title=template["title"],
                amount=amount,
                category_id=cat_map[template["cat"]],
                note=note if note else None,
                date=tx_date,
                created_at=datetime.combine(
                    tx_date,
                    datetime.min.time().replace(
                        hour=random.randint(8, 20),
                        minute=random.randint(0, 59)
                    )
                )
            )
            session.add(tx)

    # Seed today's transactions too
    for i in range(random.randint(4, 7)):
        is_income = random.choice([True, False])
        template = random.choice(INCOME_TEMPLATES) if is_income else random.choice(EXPENSE_TEMPLATES)
        amount = round(random.uniform(template["min"], template["max"]), 2)
        note = random.choice(NOTES)
        
        tx = Transaction(
            type="income" if is_income else "expense",
            title=template["title"],
            amount=amount,
            category_id=cat_map[template["cat"]],
            note=note if note else None,
            date=today,
            created_at=datetime.combine(
                today,
                datetime.min.time().replace(
                    hour=random.randint(8, 15),
                    minute=random.randint(0, 59)
                )
            )
        )
        session.add(tx)


def seed_settings(session: Session) -> None:
    """Seed default application settings."""
    for key, val in DEFAULT_SETTINGS.items():
        existing = session.exec(StoreSetting).where(StoreSetting.key == key).first()
        if not existing:
            session.add(StoreSetting(key=key, value=val))


def seed_notifications(session: Session) -> None:
    """Seed notification history for the last 7 days."""
    today = date.today()
    random.seed(99)

    for offset in range(7, 0, -1):
        notif_date = today - timedelta(days=offset)
        dt_base = datetime.combine(notif_date, datetime.min.time())

        # Generate a premium daily summary notification
        day_income = round(random.uniform(8000, 35000), 2)
        day_expense = round(random.uniform(5000, 22000), 2)
        day_profit = day_income - day_expense
        trend_icon = "📈" if day_profit >= 0 else "📉"

        summary_notif = Notification(
            message=(
                f"📊 สรุปยอดรายวัน {notif_date.strftime('%d/%m/%Y')} | "
                f"รายรับรวม: {day_income:,.2f} บาท | รายจ่ายรวม: {day_expense:,.2f} บาท | "
                f"{trend_icon} กำไรสุทธิ: {day_profit:,.2f} บาท"
            ),
            type="summary",
            amount=day_profit,
            created_at=dt_base.replace(hour=21, minute=0),
            is_read=offset > 3,
        )
        session.add(summary_notif)

        # 1-2 random transaction notifications
        for j in range(random.randint(1, 2)):
            is_income = random.choice([True, False])
            amount = round(random.uniform(1000, 10000) if is_income else random.uniform(500, 5000), 2)
            
            if is_income:
                msg = f"💰 รายรับ: ยอดขายออนไลน์เข้ามา {amount:,.2f} บาท"
                notif_type = "income"
            else:
                msg = f"💸 รายจ่าย: ซื้อวัตถุดิบด่วนเข้าร้าน {amount:,.2f} บาท"
                notif_type = "expense"

            notif = Notification(
                message=msg,
                type=notif_type,
                amount=amount,
                created_at=dt_base.replace(
                    hour=random.randint(9, 18),
                    minute=random.randint(0, 59)
                ),
                is_read=offset > 3,
            )
            session.add(notif)

    # Initial Welcome system notification
    session.add(
        Notification(
            message="🎉 ยินดีต้อนรับสู่ U-Dash Dashboard! ระบบวิเคราะห์ธุรกิจและแจ้งเตือน LINE ทำงานสำเร็จแล้ว",
            type="system",
            amount=None,
            created_at=datetime.combine(today - timedelta(days=7), datetime.min.time().replace(hour=8)),
            is_read=True
        )
    )


def seed_all(session: Session) -> None:
    """Execute all seed tasks sequentially inside transaction scope."""
    seed_admin_user(session)
    session.flush()
    
    cat_map = seed_categories(session)
    session.flush()

    seed_transactions(session, cat_map)
    seed_settings(session)
    seed_notifications(session)

    session.commit()
    print("✅ Seed database with 14 days of realistic Thai business demo data!")
