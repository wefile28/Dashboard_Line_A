"""
Transactions API router.
Provides list, create, update, delete, and recent endpoints.
Uses FastAPI BackgroundTasks for asynchronous LINE Notify alerts.
Secured with JWT-based administrator authorization.
"""

from datetime import date
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


@router.get("")
def list_transactions(
    type: Optional[str] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """
    List transactions with support for filters, search, and pagination.
    """
    query = select(Transaction)
    count_query = select(func.count()).select_from(Transaction)

    if type:
        query = query.where(col(Transaction.type) == type)
        count_query = count_query.where(col(Transaction.type) == type)
    if category_id:
        query = query.where(col(Transaction.category_id) == category_id)
        count_query = count_query.where(col(Transaction.category_id) == category_id)
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
    offset = (page - 1) * limit
    query = query.order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
    query = query.offset(offset).limit(limit)

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

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": ceil(total / limit) if total > 0 else 1,
    }


@router.get("/recent")
def get_recent_transactions(
    limit: int = Query(default=5, ge=1, le=50),
    session: Session = Depends(get_session),
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
    data: TransactionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new transaction.
    Automatically creates a dashboard notification and enqueues an async LINE Notify alert task.
    """
    # Validate category exists
    category = session.get(Category, data.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="หมวดหมู่ไม่พบ")

    # Validate type consistency
    if data.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="ประเภทต้องเป็น income หรือ expense")

    tx = Transaction.model_validate(data)
    session.add(tx)
    session.commit()
    session.refresh(tx)

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

    # Retrieve settings for LINE Notify configuration
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
                data.title, data.amount, data.date.strftime("%d/%m/%Y")
            )
        else:
            line_msg = format_expense_message(
                data.title, data.amount, data.date.strftime("%d/%m/%Y")
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
        },
    }


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing transaction by ID. Secured with admin authorization.
    """
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="ไม่พบรายการที่ต้องการแก้ไข")

    update_data = data.model_dump(exclude_unset=True)

    # Validate category if modified
    if "category_id" in update_data:
        category = session.get(Category, update_data["category_id"])
        if not category:
            raise HTTPException(status_code=404, detail="หมวดหมู่ไม่พบ")

    for key, value in update_data.items():
        setattr(tx, key, value)

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
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="ไม่พบรายการที่ต้องการลบ")

    session.delete(tx)
    session.commit()
    return {"detail": "ลบรายการสำเร็จ", "id": transaction_id}
