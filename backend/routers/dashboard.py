"""
Dashboard API router.
Provides overview stats, daily/monthly charts, category breakdown,
and a single-call summary endpoint.
Supports dynamic date range filtering for all data aggregations.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, col

from database import get_session
from models import Transaction, Category

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
@router.get("/summary")
def get_dashboard_summary(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    session: Session = Depends(get_session)
):
    """
    Get overview stats, Recharts trend data, category expense breakdown,
    and 5 recent transactions in a single, high-performance combined call.
    Supports dynamic date range filtering.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # 1. Parse date parameters if provided
    start = None
    end = None
    if start_date:
        try:
            start = date.fromisoformat(start_date)
        except ValueError:
            pass
    if end_date:
        try:
            end = date.fromisoformat(end_date)
        except ValueError:
            pass

    # 2. Compute Aggregates & Comparison Changes
    if start and end:
        # Custom date range calculation
        delta = end - start + timedelta(days=1)
        prev_start = start - delta
        prev_end = start - timedelta(days=1)

        # Current period aggregates
        curr_income = _sum_by_type_and_range(session, "income", start, end)
        curr_expense = _sum_by_type_and_range(session, "expense", start, end)
        curr_profit = curr_income - curr_expense

        # Previous period aggregates for mathematical comparison
        prev_income = _sum_by_type_and_range(session, "income", prev_start, prev_end)
        prev_expense = _sum_by_type_and_range(session, "expense", prev_start, prev_end)
        prev_profit = prev_income - prev_expense

        income_change = _pct_change(prev_income, curr_income)
        expense_change = _pct_change(prev_expense, curr_expense)
        profit_change = _pct_change(prev_profit, curr_profit)

        # Sparklines / Daily trends for each day in range
        weekly_data = []
        # Limit daily chart to 31 days max to prevent frontend overload
        chart_days = min(delta.days, 31)
        for i in range(chart_days):
            d = start + timedelta(days=i)
            day_inc = _sum_by_type_and_date(session, "income", d)
            day_exp = _sum_by_type_and_date(session, "expense", d)
            weekly_data.append({
                "date": d.isoformat(),
                "income": round(day_inc, 2),
                "expense": round(day_exp, 2),
                "profit": round(day_inc - day_exp, 2)
            })

        # Category expense breakdown in this range
        expense_by_category = _get_categories_breakdown(session, start, end)

        # Recent transactions in this range
        tx_query = (
            select(Transaction)
            .where(col(Transaction.date) >= start)
            .where(col(Transaction.date) <= end)
            .order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
            .limit(5)
        )
        transactions = session.exec(tx_query).all()

    else:
        # Default dashboard view (Today stats compared to Yesterday, 14 days chart)
        curr_income = _sum_by_type_and_date(session, "income", today)
        curr_expense = _sum_by_type_and_date(session, "expense", today)
        curr_profit = curr_income - curr_expense

        prev_income = _sum_by_type_and_date(session, "income", yesterday)
        prev_expense = _sum_by_type_and_date(session, "expense", yesterday)
        prev_profit = prev_income - prev_expense

        income_change = _pct_change(prev_income, curr_income)
        expense_change = _pct_change(prev_expense, curr_expense)
        profit_change = _pct_change(prev_profit, curr_profit)

        # Default 14-day daily chart
        weekly_data = []
        for i in range(13, -1, -1):
            d = today - timedelta(days=i)
            day_inc = _sum_by_type_and_date(session, "income", d)
            day_exp = _sum_by_type_and_date(session, "expense", d)
            weekly_data.append({
                "date": d.isoformat(),
                "income": round(day_inc, 2),
                "expense": round(day_exp, 2),
                "profit": round(day_inc - day_exp, 2)
            })

        # Category expense breakdown for the current month
        first_day_of_month = date(today.year, today.month, 1)
        expense_by_category = _get_categories_breakdown(session, first_day_of_month, today)

        # 5 most recent transactions overall
        tx_query = (
            select(Transaction)
            .order_by(col(Transaction.date).desc(), col(Transaction.id).desc())
            .limit(5)
        )
        transactions = session.exec(tx_query).all()

    # 3. Monthly trend comparison (last 12 months) - stable background stat
    monthly_data = []
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

        inc = _sum_by_type_and_range(session, "income", first_day, last_day)
        exp = _sum_by_type_and_range(session, "expense", first_day, last_day)

        monthly_data.append({
            "month": first_day.strftime("%Y-%m"),
            "income": round(inc, 2),
            "expense": round(exp, 2),
            "profit": round(inc - exp, 2)
        })

    # 4. Serialize transactions with nested category data
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
            "category": tx.category.name if tx.category else "อื่นๆ"
        }
        recent_transactions.append(tx_dict)

    return {
        "today_income": round(curr_income, 2),
        "today_expense": round(curr_expense, 2),
        "today_profit": round(curr_profit, 2),
        "yesterday_income": round(prev_income, 2),
        "yesterday_expense": round(prev_expense, 2),
        "yesterday_profit": round(prev_profit, 2),
        "income_change": income_change,
        "expense_change": expense_change,
        "profit_change": profit_change,
        "weekly_data": weekly_data,
        "monthly_data": monthly_data,
        "expense_by_category": expense_by_category,
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


def _get_categories_breakdown(session: Session, start: date, end: date) -> list[dict]:
    statement = (
        select(
            Category.name,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, col(Transaction.category_id) == col(Category.id))
        .where(col(Transaction.type) == "expense")
        .where(col(Transaction.date) >= start)
        .where(col(Transaction.date) <= end)
        .group_by(Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = session.exec(statement).all()
    total_expense = sum(float(row[2] or 0) for row in rows)

    result = []
    for row in rows:
        val = float(row[2] or 0)
        pct = (val / total_expense * 100) if total_expense > 0 else 0.0
        result.append({
            "category": row[0],
            "total": round(val, 2),
            "color": row[1],
            "percentage": round(pct, 2)
        })
    return result
