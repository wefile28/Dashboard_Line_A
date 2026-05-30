"""
Dashboard API router.
Provides overview stats, daily/monthly charts, category breakdown,
and a single-call summary endpoint.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func, col

from database import get_session
from models import Transaction, Category

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
def get_overview(session: Session = Depends(get_session)):
    """
    Get today's income, expense, profit and percentage change vs yesterday.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Today aggregates
    today_income = _sum_by_type_and_date(session, "income", today)
    today_expense = _sum_by_type_and_date(session, "expense", today)
    today_profit = today_income - today_expense

    # Yesterday aggregates for comparison
    yest_income = _sum_by_type_and_date(session, "income", yesterday)
    yest_expense = _sum_by_type_and_date(session, "expense", yesterday)
    yest_profit = yest_income - yest_expense

    return {
        "today_income": round(today_income, 2),
        "today_expense": round(today_expense, 2),
        "today_profit": round(today_profit, 2),
        "income_change_pct": _pct_change(yest_income, today_income),
        "expense_change_pct": _pct_change(yest_expense, today_expense),
        "profit_change_pct": _pct_change(yest_profit, today_profit),
    }


@router.get("/chart/daily")
def get_daily_chart(session: Session = Depends(get_session)):
    """
    Daily income vs expense for the last 7 days.
    Returns [{date, income, expense}].
    """
    today = date.today()
    result = []

    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        income = _sum_by_type_and_date(session, "income", d)
        expense = _sum_by_type_and_date(session, "expense", d)
        result.append({
            "date": d.isoformat(),
            "income": round(income, 2),
            "expense": round(expense, 2),
        })

    return result


@router.get("/chart/monthly")
def get_monthly_chart(session: Session = Depends(get_session)):
    """
    Monthly income vs expense for the last 12 months.
    Returns [{month, income, expense}].
    """
    today = date.today()
    result = []

    for i in range(11, -1, -1):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        income = _sum_by_type_and_range(session, "income", first_day, last_day)
        expense = _sum_by_type_and_range(session, "expense", first_day, last_day)

        month_label = first_day.strftime("%Y-%m")
        result.append({
            "month": month_label,
            "income": round(income, 2),
            "expense": round(expense, 2),
        })

    return result


@router.get("/chart/categories")
def get_category_chart(session: Session = Depends(get_session)):
    """
    Expense breakdown by category for the current month.
    Returns [{name, value, color}].
    """
    today = date.today()
    first_day = date(today.year, today.month, 1)

    statement = (
        select(
            Category.name,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, col(Transaction.category_id) == col(Category.id))
        .where(col(Transaction.type) == "expense")
        .where(col(Transaction.date) >= first_day)
        .where(col(Transaction.date) <= today)
        .group_by(Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )

    rows = session.exec(statement).all()
    return [
        {
            "name": row[0],
            "value": round(float(row[2] or 0), 2),
            "color": row[1],
        }
        for row in rows
    ]


@router.get("/summary")
def get_dashboard_summary(session: Session = Depends(get_session)):
    """
    Get overview stats, 14-day recharts data, and 5 recent transactions
    in a single, high-performance combined call.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # 1. Overview aggregates
    today_income = _sum_by_type_and_date(session, "income", today)
    today_expense = _sum_by_type_and_date(session, "expense", today)
    today_profit = today_income - today_expense

    yest_income = _sum_by_type_and_date(session, "income", yesterday)
    yest_expense = _sum_by_type_and_date(session, "expense", yesterday)
    yest_profit = yest_income - yest_expense

    overview = {
        "today_income": round(today_income, 2),
        "today_expense": round(today_expense, 2),
        "today_profit": round(today_profit, 2),
        "income_change_pct": _pct_change(yest_income, today_income),
        "expense_change_pct": _pct_change(yest_expense, today_expense),
        "profit_change_pct": _pct_change(yest_profit, today_profit),
    }

    # 2. 14-day recharts data
    recharts_data = []
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        day_inc = _sum_by_type_and_date(session, "income", d)
        day_exp = _sum_by_type_and_date(session, "expense", d)
        recharts_data.append({
            "date": d.isoformat(),
            "income": round(day_inc, 2),
            "expense": round(day_exp, 2),
            "profit": round(day_inc - day_exp, 2)
        })

    # 3. 5 recent transactions
    tx_query = (
        select(Transaction)
        .order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
        .limit(5)
    )
    transactions = session.exec(tx_query).all()

    recent_transactions = []
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
        recent_transactions.append(tx_dict)

    return {
        "overview": overview,
        "recharts_data": recharts_data,
        "recent_transactions": recent_transactions
    }


# ─── Helper Functions ────────────────────────────────────────────────────────────


def _sum_by_type_and_date(session: Session, tx_type: str, target_date: date) -> float:
    statement = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        col(Transaction.type) == tx_type,
        col(Transaction.date) == target_date,
    )
    result = session.exec(statement).one()
    return float(result)


def _sum_by_type_and_range(
    session: Session, tx_type: str, start: date, end: date
) -> float:
    statement = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        col(Transaction.type) == tx_type,
        col(Transaction.date) >= start,
        col(Transaction.date) <= end,
    )
    result = session.exec(statement).one()
    return float(result)


def _pct_change(old: float, new: float) -> float:
    if old == 0:
        return 100.0 if new > 0 else (-100.0 if new < 0 else 0.0)
    return round(((new - old) / abs(old)) * 100, 2)
