"""
Notifications API router.
List, mark-read, and clear notification history.
Secured with JWT-based administrator authorization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from database import get_session
from models import Notification, User
from auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """Get notifications ordered by newest first."""
    query = (
        select(Notification)
        .order_by(col(Notification.created_at).desc())
        .limit(limit)
    )
    notifications = session.exec(query).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "amount": n.amount,
            "created_at": n.created_at.isoformat(),
            "is_read": n.is_read,
        }
        for n in notifications
    ]


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read. Secured with admin authorization."""
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="ไม่พบการแจ้งเตือน")

    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"detail": "อ่านแล้ว", "id": notification_id}


@router.put("/read-all")
def mark_all_as_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications as read. Secured with admin authorization."""
    unread = session.exec(
        select(Notification).where(col(Notification.is_read) == False)
    ).all()

    count = 0
    for n in unread:
        n.is_read = True
        session.add(n)
        count += 1

    session.commit()
    return {"detail": f"อ่านทั้งหมด {count} รายการ", "count": count}


@router.delete("/clear")
def clear_all_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all notifications. Secured with admin authorization."""
    notifications = session.exec(select(Notification)).all()
    count = len(notifications)

    for n in notifications:
        session.delete(n)

    session.commit()
    return {"detail": f"ลบการแจ้งเตือน {count} รายการ", "count": count}
