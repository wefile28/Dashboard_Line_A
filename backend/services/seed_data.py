"""
Seed data generator for the U-Dash Dashboard application.
Generates exactly 14 days of realistic Thai business demo data for "ร้านกาแฟ BrewLab ☕️".
Seeds default categories, admin/staff users, and app settings.
"""

import random
from datetime import date, datetime, timedelta
from sqlmodel import Session, select

from models import Category, Transaction, StoreSetting, Notification, User
from auth import hash_password

# ─── Default Categories for BrewLab ☕️ ──────────────────────────────────────────

DEFAULT_CATEGORIES = [
    # Income categories
    {"name": "รับเงินสดหน้าร้าน", "type": "income", "icon": "💵", "color": "#10b981"},
    {"name": "ยอดโอน / สแกน QR", "type": "income", "icon": "📱", "color": "#3b82f6"},
    {"name": "เดลิเวอรี่ (Grab / Lineman)", "type": "income", "icon": "🛵", "color": "#f59e0b"},
    
    # Expense categories
    {"name": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "type": "expense", "icon": "☕", "color": "#8b5cf6"},
    {"name": "ค่าจ้างพนักงาน (รายวัน/รายเดือน)", "type": "expense", "icon": "👥", "color": "#ec4899"},
    {"name": "ค่าน้ำ / ค่าไฟ", "type": "expense", "icon": "💡", "color": "#eab308"},
    {"name": "ค่าการตลาด / โปรโมทเพจ", "type": "expense", "icon": "📣", "color": "#06b6d4"},
    {"name": "ค่าเช่าร้าน", "type": "expense", "icon": "🏠", "color": "#ef4444"},
]

# ─── Transaction Templates for Realistic Cafe Generation ──────────────────────────────

INCOME_TEMPLATES = [
    {"title": "อเมริกาโน่เย็น + ครัวซองต์เนยสด", "cat": "รับเงินสดหน้าร้าน", "min": 125, "max": 240},
    {"title": "เอสเพรสโซ่เย็น 2 แก้ว + เค้กช็อกโกแลต", "cat": "ยอดโอน / สแกน QR", "min": 190, "max": 350},
    {"title": "คาปูชิโน่ร้อน (เมล็ดพิเศษ) + สโคน", "cat": "ยอดโอน / สแกน QR", "min": 110, "max": 180},
    {"title": "มัทฉะลาเต้เย็น + นิวยอร์กชีสเค้ก", "cat": "รับเงินสดหน้าร้าน", "min": 140, "max": 260},
    {"title": "โกโก้เย็นพรีเมียม 1 แก้ว", "cat": "รับเงินสดหน้าร้าน", "min": 65, "max": 90},
    {"title": "ออเดอร์เดลิเวอรี่ Lineman: ลาเต้เย็น 3 แก้ว", "cat": "เดลิเวอรี่ (Grab / Lineman)", "min": 195, "max": 320},
    {"title": "ออเดอร์เดลิเวอรี่ Grab: ชาไทยเย็น 2 แก้ว + แซนด์วิชแฮมชีส", "cat": "เดลิเวอรี่ (Grab / Lineman)", "min": 160, "max": 280},
    {"title": "ขายเมล็ดกาแฟคั่ว BrewLab House Blend (250g)", "cat": "ยอดโอน / สแกน QR", "min": 350, "max": 750},
    {"title": "ออเดอร์หน้าร้านสแกนโอน: ครัวซองต์กล่อง 4 ชิ้น", "cat": "ยอดโอน / สแกน QR", "min": 280, "max": 380},
]

EXPENSE_TEMPLATES = [
    # Raw materials ordered every few days
    {"title": "สั่งซื้อนมสดพาสเจอร์ไรส์ (เมจิ) 2 ลัง", "cat": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "min": 640, "max": 780},
    {"title": "ซื้อเมล็ดกาแฟจากแหล่งคั่วเชียงราย (5 kg)", "cat": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "min": 2200, "max": 3500},
    {"title": "สั่งสกรีนแก้วพลาสติก BrewLab 500 ใบ", "cat": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "min": 1200, "max": 1800},
    {"title": "ซื้อน้ำแข็งยูนิคหลอดเล็กเข้าร้านด่วน", "cat": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "min": 80, "max": 150},
    {"title": "ค่าวิปครีมและไซรัปคาราเมลล็อตใหม่", "cat": "ค่าวัตถุดิบ (เมล็ดกาแฟ, นม, แก้ว)", "min": 450, "max": 950},
    
    # Utilities, rent, marketing
    {"title": "ค่าน้ำประปาประจำเดือน", "cat": "ค่าน้ำ / ค่าไฟ", "min": 450, "max": 850},
    {"title": "ค่าไฟฟ้าเครื่องชงและแอร์ร้าน", "cat": "ค่าน้ำ / ค่าไฟ", "min": 3500, "max": 6500},
    {"title": "ค่าอินเทอร์เน็ตความเร็วสูงร้าน", "cat": "ค่าน้ำ / ค่าไฟ", "min": 599, "max": 799},
    {"title": "ยิงแอดโปรโมทเมนูใหม่บน Facebook", "cat": "ค่าการตลาด / โปรโมทเพจ", "min": 300, "max": 1000},
    {"title": "ค่าเช่าสถานที่ (BrewLab Community Mall)", "cat": "ค่าเช่าร้าน", "min": 15000, "max": 15000},
    
    # Employee salary
    {"title": "จ่ายค่าแรงพนักงานหน้าร้าน (รายกะกัปตัน)", "cat": "ค่าจ้างพนักงาน (รายวัน/รายเดือน)", "min": 450, "max": 500},
    {"title": "จ่ายเงินเดือนบาริสต้าประจำ", "cat": "ค่าจ้างพนักงาน (รายวัน/รายเดือน)", "min": 12000, "max": 15000},
]

NOTES = [
    "ลูกค้าประจำทานที่ร้าน", "สแกนโอนไว", "ไม่ใส่หวาน", "หักค่า GP เดลิเวอรี่แล้ว",
    "ลูกค้าชาวต่างชาติ", "กาแฟคั่วกลางอินโดนีเซีย", "ซื้อกลับบ้าน", "จ่ายด้วยเงินสดเก๊ะ"
]

# ─── Default Store Settings for BrewLab ☕️ ───────────────────────────────────────

DEFAULT_SETTINGS = {
    "shop_name": "ร้านกาแฟ BrewLab ☕️",
    "line_token": "",
    "currency": "THB",
    "notification_enabled": "true",
}


def seed_users(session: Session) -> None:
    """Create administrator (Owner) and employee (Staff) users."""
    # 1. Admin/Owner Credentials
    admin_email = "admin@udash.com"
    existing_admin = session.exec(select(User).where(User.email == admin_email)).first()
    if not existing_admin:
        admin = User(
            email=admin_email,
            hashed_password=hash_password("udash2026"),
            full_name="เจ้าของร้าน BrewLab (Owner)",
            role="owner",
            store_id="brewlab",
            is_active=True,
            created_at=datetime.utcnow()
        )
        session.add(admin)
    
    # 2. Staff/Employee Credentials (Shared Shift Account)
    staff_email = "staff@udash.com"
    existing_staff = session.exec(select(User).where(User.email == staff_email)).first()
    if not existing_staff:
        staff = User(
            email=staff_email,
            hashed_password=hash_password("brewlab2026"),
            full_name="พนักงานหน้าเคาน์เตอร์ BrewLab",
            role="employee",
            store_id="brewlab",
            is_active=True,
            created_at=datetime.utcnow()
        )
        session.add(staff)


def seed_categories(session: Session) -> dict[str, int]:
    """Seed categories and return name -> ID map."""
    cat_map = {}
    for cat_data in DEFAULT_CATEGORIES:
        existing = session.exec(
            select(Category).where(Category.name == cat_data["name"], Category.type == cat_data["type"])
        ).first()
        if not existing:
            cat = Category(**cat_data)
            session.add(cat)
            session.flush()
            cat_map[cat.name] = cat.id
        else:
            cat_map[existing.name] = existing.id
    return cat_map


def seed_transactions(session: Session, cat_map: dict[str, int]) -> None:
    """Generate 14 days of realistic transaction data (5 to 12 transactions per day)."""
    today = date.today()
    random.seed(2026)  # Deterministic seed for reproducible dashboard metrics

    for offset in range(14, 0, -1):
        tx_date = today - timedelta(days=offset)
        # Cafes have higher volume: 5 to 12 transactions
        num_tx = random.randint(5, 12)
        
        for i in range(num_tx):
            # 70% chance of income for a busy cafe
            is_income = random.random() < 0.7
            template = random.choice(INCOME_TEMPLATES) if is_income else random.choice(EXPENSE_TEMPLATES)
            
            # Avoid repeating rent/monthly salaries every single day
            if not is_income and template["cat"] == "ค่าเช่าร้าน" and offset != 14:
                continue
            if not is_income and "จ่ายเงินเดือนบาริสต้าประจำ" in template["title"] and offset != 14:
                continue
            if not is_income and "ค่าน้ำประปาประจำเดือน" in template["title"] and offset != 10:
                continue
            if not is_income and "ค่าไฟฟ้าเครื่องชงและแอร์ร้าน" in template["title"] and offset != 10:
                continue

            amount = round(random.uniform(template["min"], template["max"]), 2)
            note = random.choice(NOTES) if random.random() < 0.6 else None
            
            tx = Transaction(
                type="income" if is_income else "expense",
                title=template["title"],
                amount=amount,
                category_id=cat_map[template["cat"]],
                note=note,
                date=tx_date,
                created_at=datetime.combine(
                    tx_date,
                    datetime.min.time().replace(
                        hour=random.randint(7, 18),
                        minute=random.randint(0, 59)
                    )
                )
            )
            session.add(tx)

    # Seed today's transactions too
    for i in range(random.randint(6, 10)):
        is_income = random.random() < 0.75
        template = random.choice(INCOME_TEMPLATES) if is_income else random.choice(EXPENSE_TEMPLATES)
        if not is_income and template["cat"] == "ค่าเช่าร้าน":
            continue
        
        amount = round(random.uniform(template["min"], template["max"]), 2)
        note = random.choice(NOTES) if random.random() < 0.5 else None
        
        tx = Transaction(
            type="income" if is_income else "expense",
            title=template["title"],
            amount=amount,
            category_id=cat_map[template["cat"]],
            note=note,
            date=today,
            created_at=datetime.combine(
                today,
                datetime.min.time().replace(
                    hour=random.randint(7, 14),
                    minute=random.randint(0, 59)
                )
            )
        )
        session.add(tx)


def seed_settings(session: Session) -> None:
    """Seed default application settings."""
    for key, val in DEFAULT_SETTINGS.items():
        existing = session.exec(select(StoreSetting).where(StoreSetting.key == key)).first()
        if existing:
            # Overwrite existing to ensure BrewLab is set
            existing.value = val
            session.add(existing)
        else:
            session.add(StoreSetting(key=key, value=val))


def seed_notifications(session: Session) -> None:
    """Seed notification history for the last 7 days."""
    today = date.today()
    random.seed(99)

    for offset in range(7, 0, -1):
        notif_date = today - timedelta(days=offset)
        dt_base = datetime.combine(notif_date, datetime.min.time())

        # Generate a premium daily summary notification
        day_income = round(random.uniform(3200, 7500), 2)
        day_expense = round(random.uniform(450, 1800), 2)
        day_profit = day_income - day_expense
        trend_icon = "📈" if day_profit >= 0 else "📉"

        summary_notif = Notification(
            message=(
                f"📊 สรุปยอดขายร้าน BrewLab ประจำวันที่ {notif_date.strftime('%d/%m/%Y')} | "
                f"รายรับรวม: {day_income:,.2f} บาท | รายจ่ายรวม: {day_expense:,.2f} บาท | "
                f"{trend_icon} กำไรสุทธิ: {day_profit:,.2f} บาท"
            ),
            type="summary",
            amount=day_profit,
            created_at=dt_base.replace(hour=20, minute=0),
            is_read=offset > 3,
        )
        session.add(summary_notif)

        # 1-2 random transaction notifications
        for j in range(random.randint(1, 2)):
            is_income = random.choice([True, False])
            amount = round(random.uniform(250, 1200) if is_income else random.uniform(80, 800), 2)
            
            if is_income:
                msg = f"💰 BrewLab Alert! ลูกค้าโอนเงินสแกน QR เข้ามา {amount:,.2f} บาท สดชื่นเลยเถ้าแก่!"
                notif_type = "income"
            else:
                msg = f"💸 BrewLab Alert! พนักงานเบิกเงินเก๊ะจ่ายค่าวัตถุดิบด่วน {amount:,.2f} บาท"
                notif_type = "expense"

            notif = Notification(
                message=msg,
                type=notif_type,
                amount=amount,
                created_at=dt_base.replace(
                    hour=random.randint(8, 17),
                    minute=random.randint(0, 59)
                ),
                is_read=offset > 3,
            )
            session.add(notif)

    # Initial Welcome system notification
    session.add(
        Notification(
            message="🎉 ยินดีต้อนรับเข้าสู่ระบบ U-Dash Dashboard! เชื่อมต่อ LINE Notify ร้านกาแฟ BrewLab ☕️ สำเร็จแล้ว",
            type="system",
            amount=None,
            created_at=datetime.combine(today - timedelta(days=7), datetime.min.time().replace(hour=7, minute=30)),
            is_read=True
        )
    )


def seed_all(session: Session) -> None:
    """Execute all seed tasks sequentially inside transaction scope."""
    seed_users(session)
    session.flush()
    
    cat_map = seed_categories(session)
    session.flush()

    seed_transactions(session, cat_map)
    seed_settings(session)
    seed_notifications(session)

    session.commit()
    print("Seed database with 14 days of BrewLab Cafe demo data!")
