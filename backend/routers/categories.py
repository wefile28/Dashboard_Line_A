"""
Categories API router.
CRUD operations for income/expense categories.
Secured with JWT-based administrator authorization.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col, func

from database import get_session
from models import Category, CategoryCreate, CategoryUpdate, Transaction, User
from auth import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("")
def list_categories(
    type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """List all categories, optionally filtered by type (income/expense)."""
    query = select(Category)
    if type:
        query = query.where(col(Category.type) == type)
    query = query.order_by(col(Category.type), col(Category.name))
    categories = session.exec(query).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "icon": c.icon,
            "color": c.color,
        }
        for c in categories
    ]


@router.post("", status_code=201)
def create_category(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new category. Secured with admin authorization."""
    if data.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="ประเภทต้องเป็น income หรือ expense")

    # Check for duplicate name within same type
    existing = session.exec(
        select(Category).where(
            col(Category.name) == data.name,
            col(Category.type) == data.type,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="หมวดหมู่นี้มีอยู่แล้ว")

    category = Category.model_validate(data)
    session.add(category)
    session.commit()
    session.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "type": category.type,
        "icon": category.icon,
        "color": category.color,
    }


@router.put("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an existing category by ID. Secured with admin authorization."""
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="ไม่พบหมวดหมู่")

    update_data = data.model_dump(exclude_unset=True)

    if "type" in update_data and update_data["type"] not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="ประเภทต้องเป็น income หรือ expense")

    for key, value in update_data.items():
        setattr(category, key, value)

    session.add(category)
    session.commit()
    session.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "type": category.type,
        "icon": category.icon,
        "color": category.color,
    }


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a category. Fails if transactions reference it. Secured with admin authorization."""
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="ไม่พบหมวดหมู่")

    # Check for linked transactions
    tx_count = session.exec(
        select(func.count()).select_from(Transaction).where(
            col(Transaction.category_id) == category_id
        )
    ).one()

    if tx_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"ไม่สามารถลบได้ มีรายการที่ใช้หมวดหมู่นี้ {tx_count} รายการ",
        )

    session.delete(category)
    session.commit()
    return {"detail": "ลบหมวดหมู่สำเร็จ", "id": category_id}
