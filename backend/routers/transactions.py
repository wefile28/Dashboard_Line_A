"""
Transactions API router.
Provides list, create, update, delete, and recent endpoints.
Uses FastAPI BackgroundTasks for asynchronous LINE Notify alerts.
Secured with JWT-based administrator authorization.
"""

from datetime import date as date_type
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlmodel import Session, select, func, col

from database import get_session, engine
from models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    Category,
    Notification,
    StoreSetting,
    User
)
from auth import get_current_user
from services.line_notify import (
    send_notification_sync,
    format_income_message,
    format_expense_message,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


from pydantic import BaseModel

class TransactionCreateInput(BaseModel):
    type: str  # "income" | "expense"
    title: str
    amount: float
    category_id: Optional[int] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[date_type] = None

class TransactionUpdateInput(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    amount: Optional[float] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[date_type] = None


def resolve_category(
    category_id: Optional[int],
    category_name: Optional[str],
    tx_type: str,
    session: Session
) -> int:
    """
    Resolves the category ID from either category_id or category_name.
    If category_name is supplied, attempts to find or dynamically create it with a premium preset.
    """
    if category_id is not None:
        cat = session.get(Category, category_id)
        if cat:
            return cat.id
            
    if category_name is not None and category_name.strip():
        name_clean = category_name.strip()
        cat = session.exec(
            select(Category).where(col(Category.name) == name_clean, col(Category.type) == tx_type)
        ).first()
        if cat:
            return cat.id
            
        # Dynamically create category using premium solver (Colors & Icons)
        name_l = name_clean.lower()
        if tx_type == "income":
            if "ขาย" in name_l:
                icon, color = "🛒", "#22c55e"
            elif "บริการ" in name_l:
                icon, color = "🔧", "#3b82f6"
            elif "คอม" in name_l or "แนะ" in name_l:
                icon, color = "🤝", "#06b6d4"
            else:
                icon, color = "💎", "#a855f7"
        else:
            if "วัตถุดิบ" in name_l or "ซื้อ" in name_l:
                icon, color = "📦", "#ef4444"
            elif "เช่า" in name_l:
                icon, color = "🏠", "#f97316"
            elif "น้ำ" in name_l or "ไฟ" in name_l or "เน็ต" in name_l:
                icon, color = "💡", "#eab308"
            elif "เดือน" in name_l or "จ้าง" in name_l or "พนักงาน" in name_l:
                icon, color = "👥", "#ec4899"
            elif "ส่ง" in name_l or "รถ" in name_l or "มัน" in name_l:
                icon, color = "🚚", "#8b5cf6"
            elif "ตลาด" in name_l or "โฆษณา" in name_l or "แอด" in name_l:
                icon, color = "📣", "#14b8a6"
            else:
                icon, color = "📝", "#64748b"
                
        new_cat = Category(name=name_clean, type=tx_type, icon=icon, color=color)
        session.add(new_cat)
        session.flush() # Populate new_cat.id
        return new_cat.id
        
    # Fallback to general "อื่นๆ" category of that type
    default_name = "อื่นๆ"
    cat = session.exec(
        select(Category).where(col(Category.name) == default_name, col(Category.type) == tx_type)
    ).first()
    if cat:
        return cat.id
        
    # Create default "อื่นๆ" if missing
    new_cat = Category(name=default_name, type=tx_type, icon="📝", color="#64748b")
    session.add(new_cat)
    session.flush()
    return new_cat.id



@router.get("")
def list_transactions(
    type: Optional[str] = None,
    category_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    per_page: Optional[int] = Query(None, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List transactions with support for filters, search, and pagination.
    Aligned with per_page query parameters and category name filtering.
    """
    # Use per_page if supplied, otherwise fall back to limit
    limit_val = per_page if per_page is not None else limit
    if limit_val < 1:
        limit_val = 20
    
    query = select(Transaction)
    count_query = select(func.count()).select_from(Transaction)

    if type:
        query = query.where(col(Transaction.type) == type)
        count_query = count_query.where(col(Transaction.type) == type)
    if category_id:
        query = query.where(col(Transaction.category_id) == category_id)
        count_query = count_query.where(col(Transaction.category_id) == category_id)
    elif category and category != "all" and category.strip():
        # Clean the name and filter
        cat_clean = category.strip()
        query = query.join(Category, col(Transaction.category_id) == col(Category.id)).where(col(Category.name) == cat_clean)
        count_query = count_query.join(Category, col(Transaction.category_id) == col(Category.id)).where(col(Category.name) == cat_clean)
        
    if start_date:
        query = query.where(col(Transaction.date) >= start_date)
        count_query = count_query.where(col(Transaction.date) >= start_date)
    if end_date:
        query = query.where(col(Transaction.date) <= end_date)
        count_query = count_query.where(col(Transaction.date) <= end_date)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            col(Transaction.title).like(search_pattern)
            | col(Transaction.note).like(search_pattern)
        )
        count_query = count_query.where(
            col(Transaction.title).like(search_pattern)
            | col(Transaction.note).like(search_pattern)
        )

    # Get total count
    total = session.exec(count_query).one()

    # Paginate and sort
    offset = (page - 1) * limit_val
    query = query.order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
    query = query.offset(offset).limit(limit_val)

    transactions = session.exec(query).all()

    items = []
    for tx in transactions:
        tx_dict = {
            "id": tx.id,
            "type": tx.type,
            "title": tx.title,
            "amount": tx.amount,
            "category_id": tx.category_id,
            "note": tx.note,
            "date": tx.date.isoformat(),
            "created_at": tx.created_at.isoformat(),
            "category": None,
        }
        if tx.category:
            tx_dict["category"] = {
                "id": tx.category.id,
                "name": tx.category.name,
                "type": tx.category.type,
                "icon": tx.category.icon,
                "color": tx.category.color,
            }
        items.append(tx_dict)

    # Calculate total pages
    total_pages = ceil(total / limit_val) if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": limit_val,
        "total_pages": total_pages,
        "pages": total_pages, # Backward compatibility support
    }


@router.get("/recent")
def get_recent_transactions(
    limit: int = Query(default=5, ge=1, le=50),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get the most recent transactions.
    """
    query = (
        select(Transaction)
        .order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
        .limit(limit)
    )
    transactions = session.exec(query).all()

    items = []
    for tx in transactions:
        tx_dict = {
            "id": tx.id,
            "type": tx.type,
            "title": tx.title,
            "amount": tx.amount,
            "category_id": tx.category_id,
            "note": tx.note,
            "date": tx.date.isoformat(),
            "created_at": tx.created_at.isoformat(),
            "category": None,
        }
        if tx.category:
            tx_dict["category"] = {
                "id": tx.category.id,
                "name": tx.category.name,
                "type": tx.category.type,
                "icon": tx.category.icon,
                "color": tx.category.color,
            }
        items.append(tx_dict)

    return items


def send_line_and_log_status(notification_id: int, token: str, message: str):
    """
    Synchronous background task that pushes to LINE Notify and logs the success/failure status
    directly inside the SQLite/PostgreSQL Database notification message.
    """
    res = send_notification_sync(token, message)
    with Session(engine) as session:
        notification = session.get(Notification, notification_id)
        if notification:
            status_text = "🟢 [ส่ง LINE สำเร็จ]" if res["success"] else f"🔴 [ส่ง LINE ล้มเหลว: {res['detail']}]"
            notification.message = f"{notification.message}\n{status_text}"
            session.add(notification)
            session.commit()

@router.post("", status_code=201)
def create_transaction(
    data: TransactionCreateInput,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new transaction.
    Automatically resolves category (via ID or name string), creates dashboard notification,
    and enqueues an async LINE Notify/OA alert task.
    """
    # Validate type consistency
    if data.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="ประเภทต้องเป็น income หรือ expense")

    # Resolve category id dynamically
    resolved_cat_id = resolve_category(data.category_id, data.category, data.type, session)

    # Set default date if missing
    tx_date = data.date if data.date is not None else date_type.today()

    tx = Transaction(
        type=data.type,
        title=data.title,
        amount=data.amount,
        category_id=resolved_cat_id,
        note=data.note,
        date=tx_date
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)

    # Get resolved category for notification and JSON output
    category = session.get(Category, resolved_cat_id)

    # Auto-create dashboard notification
    notif_prefix = "💰 รายรับ" if data.type == "income" else "💸 รายจ่าย"
    notif_msg = f"{notif_prefix}: {data.title} {data.amount:,.2f} บาท"

    notification = Notification(
        message=notif_msg,
        type=data.type,
        amount=data.amount,
    )
    session.add(notification)
    session.commit()

    # Retrieve settings for LINE Notify/OA configuration
    token_setting = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "line_token")
    ).first()
    notification_enabled = session.exec(
        select(StoreSetting).where(col(StoreSetting.key) == "notification_enabled")
    ).first()

    # Enqueue LINE Notify background task if active
    if (
        token_setting
        and token_setting.value.strip()
        and notification_enabled
        and notification_enabled.value == "true"
    ):
        if data.type == "income":
            line_msg = format_income_message(
                data.title, data.amount, tx_date.strftime("%d/%m/%Y")
            )
        else:
            line_msg = format_expense_message(
                data.title, data.amount, tx_date.strftime("%d/%m/%Y")
            )
        
        background_tasks.add_task(send_line_and_log_status, notification.id, token_setting.value, line_msg)
    else:
        # Log immediately that LINE notification was not sent
        status_text = "⚠️ [ไม่ได้ส่ง LINE: ไม่ได้ตั้งค่า Token ในระบบ]"
        if notification_enabled and notification_enabled.value != "true":
            status_text = "⚠️ [ไม่ได้ส่ง LINE: การแจ้งเตือนถูกปิดการใช้งาน]"
            
        notification.message = f"{notification.message}\n{status_text}"
        session.add(notification)
        session.commit()

    # Return created resource details
    return {
        "id": tx.id,
        "type": tx.type,
        "title": tx.title,
        "amount": tx.amount,
        "category_id": tx.category_id,
        "note": tx.note,
        "date": tx.date.isoformat(),
        "created_at": tx.created_at.isoformat(),
        "category": {
            "id": category.id,
            "name": category.name,
            "type": category.type,
            "icon": category.icon,
            "color": category.color,
        } if category else None,
    }


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: TransactionUpdateInput,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing transaction by ID. Secured with admin authorization.
    """
    if current_user.role == "employee":
        raise HTTPException(
            status_code=403,
            detail="สิทธิ์การใช้งานของพนักงานไม่สามารถแก้ไขรายการธุรกรรมได้ กรุณาติดต่อเจ้าของร้าน"
        )
        
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="ไม่พบรายการที่ต้องการแก้ไข")

    update_data = data.model_dump(exclude_unset=True)

    # Determine type (use updated type, or fall back to existing transaction type)
    tx_type = update_data.get("type", tx.type)

    # Resolve category if either category_id or category string is provided
    if "category_id" in update_data or "category" in update_data:
        resolved_cat_id = resolve_category(
            update_data.get("category_id"),
            update_data.get("category"),
            tx_type,
            session
        )
        tx.category_id = resolved_cat_id

    # Update other fields
    if "type" in update_data:
        tx.type = update_data["type"]
    if "title" in update_data:
        tx.title = update_data["title"]
    if "amount" in update_data:
        tx.amount = update_data["amount"]
    if "note" in update_data:
        tx.note = update_data["note"]
    if "date" in update_data:
        tx.date = update_data["date"]

    session.add(tx)
    session.commit()
    session.refresh(tx)

    return {
        "id": tx.id,
        "type": tx.type,
        "title": tx.title,
        "amount": tx.amount,
        "category_id": tx.category_id,
        "note": tx.note,
        "date": tx.date.isoformat(),
        "created_at": tx.created_at.isoformat(),
        "category": {
            "id": tx.category.id,
            "name": tx.category.name,
            "type": tx.category.type,
            "icon": tx.category.icon,
            "color": tx.category.color,
        } if tx.category else None,
    }


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a transaction by ID. Secured with admin authorization.
    """
    if current_user.role == "employee":
        raise HTTPException(
            status_code=403,
            detail="สิทธิ์การใช้งานของพนักงานไม่สามารถลบรายการธุรกรรมได้ กรุณาติดต่อเจ้าของร้าน"
        )
        
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="ไม่พบรายการที่ต้องการลบ")

    session.delete(tx)
    session.commit()
    return {"detail": "ลบรายการสำเร็จ", "id": transaction_id}
