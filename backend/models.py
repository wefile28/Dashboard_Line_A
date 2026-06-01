from datetime import date as date_type, datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

# ─── User Model ───────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: str = Field(default="owner")  # "owner" | "employee"
    store_id: str = Field(default="brewlab")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(SQLModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "owner"
    store_id: Optional[str] = "brewlab"

class UserRead(SQLModel):
    id: int
    email: str
    full_name: str
    role: str
    store_id: str
    is_active: bool
    created_at: datetime


# ─── StoreSetting Model ─────────────────────────────────────────────────────────

class StoreSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    value: str = Field(default="")

# Keep alias for backward compatibility
Setting = StoreSetting


# ─── Category Model ───────────────────────────────────────────────────────────

class CategoryBase(SQLModel):
    name: str = Field(index=True)
    type: str = Field(index=True)  # "income" | "expense"
    icon: str = Field(default="📦")
    color: str = Field(default="#6366f1")


class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    transactions: List["Transaction"] = Relationship(back_populates="category")


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int


class CategoryUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


# ─── Transaction Model ────────────────────────────────────────────────────────

class TransactionBase(SQLModel):
    type: str = Field(index=True)  # "income" | "expense"
    title: str
    amount: float
    category_id: int = Field(foreign_key="category.id")
    note: Optional[str] = None
    date: date_type = Field(default_factory=date_type.today, index=True)


class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    category: Optional[Category] = Relationship(back_populates="transactions")


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: int
    created_at: datetime
    category: Optional[CategoryRead] = None


class TransactionUpdate(SQLModel):
    type: Optional[str] = None
    title: Optional[str] = None
    amount: Optional[float] = None
    category_id: Optional[int] = None
    note: Optional[str] = None
    date: Optional[date_type] = None


# ─── Notification Model ───────────────────────────────────────────────────────

class NotificationBase(SQLModel):
    message: str
    type: str  # "income" | "expense" | "summary" | "system"
    amount: Optional[float] = None


class Notification(NotificationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = Field(default=False)


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    id: int
    created_at: datetime
    is_read: bool
