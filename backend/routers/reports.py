"""
Reports API router.
Provides aggregated day/week/month/year financial overview summaries
and highly optimized, premium Excel-compatible Thai CSV exports.
Secured with JWT-based administrator authorization.
"""

import csv
import io
from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, col, func

from database import get_session
from models import Transaction, Category, User
from auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


def parse_dates(start_date: Optional[str], end_date: Optional[str], period: Optional[str]) -> tuple[date, date]:
    """Parse string date range filters or compute default period ranges."""
    if period is not None and period not in ("day", "week", "month", "year"):
        raise HTTPException(
            status_code=422,
            detail="ช่วงเวลา (period) ต้องเป็น day, week, month หรือ year เท่านั้น"
        )
        
    today = date.today()
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
            
    # Compute fallbacks based on period if range is not supplied or parsed invalidly
    if not start or not end:
        if period == "day":
            start = today
            end = today
        elif period == "week":
            start = today - timedelta(days=6)
            end = today
        elif period == "month":
            start = date(today.year, today.month, 1)
            end = today
        elif period == "year":
            start = date(today.year, 1, 1)
            end = today
        else:  # default to last 7 days (week)
            start = today - timedelta(days=6)
            end = today
            
    return start, end


@router.get("")
def get_report_summary(
    period: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated reports dataset for chart and ledger views.
    Includes performance-optimized database queries selecting only necessary columns.
    Secured with administrator authorization.
    """
    if current_user.role == "employee":
        raise HTTPException(
            status_code=403,
            detail="สิทธิ์การใช้งานของพนักงานไม่สามารถเรียกดูข้อมูลรายงานบัญชีได้"
        )
        
    start, end = parse_dates(start_date, end_date, period)
    
    # Performance Optimization: Query only columns type, amount, date
    statement = (
        select(Transaction.type, Transaction.amount, Transaction.date)
        .where(col(Transaction.date) >= start)
        .where(col(Transaction.date) <= end)
        .order_by(col(Transaction.date).asc())
    )
    transactions = session.exec(statement).all()
    
    # Computations
    total_income = sum(float(t[1]) for t in transactions if t[0] == "income")
    total_expense = sum(float(t[1]) for t in transactions if t[0] == "expense")
    net_profit = total_income - total_expense
    
    data_list = []
    
    if period == "year" and not start_date and not end_date:
        # Group by months of current year (1 to 12)
        monthly_map = {}
        for i in range(1, 13):
            monthly_map[i] = {"month": i, "year": start.year, "income": 0.0, "expense": 0.0, "profit": 0.0}
            
        for tx_type, amount, tx_date in transactions:
            m = tx_date.month
            if m in monthly_map:
                if tx_type == "income":
                    monthly_map[m]["income"] += float(amount)
                else:
                    monthly_map[m]["expense"] += float(amount)
                monthly_map[m]["profit"] = monthly_map[m]["income"] - monthly_map[m]["expense"]
                
        for m in sorted(monthly_map.keys()):
            monthly_map[m]["income"] = round(monthly_map[m]["income"], 2)
            monthly_map[m]["expense"] = round(monthly_map[m]["expense"], 2)
            monthly_map[m]["profit"] = round(monthly_map[m]["profit"], 2)
            data_list.append(monthly_map[m])
            
    else:
        # Group by days in parsed date range
        daily_map = {}
        delta = end - start
        
        # Populate all days in range to maintain continuous chart lines in UI
        for i in range(delta.days + 1):
            d = start + timedelta(days=i)
            d_str = d.isoformat()
            daily_map[d_str] = {"date": d_str, "income": 0.0, "expense": 0.0, "profit": 0.0}
            
        for tx_type, amount, tx_date in transactions:
            d_str = tx_date.isoformat()
            if d_str in daily_map:
                if tx_type == "income":
                    daily_map[d_str]["income"] += float(amount)
                else:
                    daily_map[d_str]["expense"] += float(amount)
                daily_map[d_str]["profit"] = daily_map[d_str]["income"] - daily_map[d_str]["expense"]
                
        for d_str in sorted(daily_map.keys()):
            daily_map[d_str]["income"] = round(daily_map[d_str]["income"], 2)
            daily_map[d_str]["expense"] = round(daily_map[d_str]["expense"], 2)
            daily_map[d_str]["profit"] = round(daily_map[d_str]["profit"], 2)
            data_list.append(daily_map[d_str])
            
    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_profit": round(net_profit, 2),
        "data": data_list
    }


@router.get("/export")
def export_csv_report(
    period: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Export a gorgeous 2-in-1 hybrid CSV spreadsheet.
    Includes an Executive Summary and a detailed Transaction Ledger.
    Prepends UTF-8 BOM bytes (\xef\xbb\xbf) to guarantee Microsoft Excel displays Thai language perfectly.
    Secured with administrator authorization.
    """
    if current_user.role == "employee":
        raise HTTPException(
            status_code=403,
            detail="สิทธิ์การใช้งานของพนักงานไม่สามารถส่งออกข้อมูลบัญชีได้"
        )
        
    start, end = parse_dates(start_date, end_date, period)
    
    # Query complete Transaction details to write detailed ledger rows
    statement = (
        select(Transaction)
        .where(col(Transaction.date) >= start)
        .where(col(Transaction.date) <= end)
        .order_by(col(Transaction.date).asc())
    )
    transactions = session.exec(statement).all()
    
    # Calculations
    total_income = sum(float(t.amount) for t in transactions if t.type == "income")
    total_expense = sum(float(t.amount) for t in transactions if t.type == "expense")
    net_profit = total_income - total_expense
    
    output = io.StringIO()
    writer = csv.writer(output, dialect="excel")
    
    # ── Section 1: Executive Summary ──
    writer.writerow(["--- ส่วนรายงานสรุปสำหรับผู้บริหาร (Executive Summary) ---"])
    writer.writerow(["ช่วงเวลารายงาน", f"{start.strftime('%d/%m/%Y')} ถึง {end.strftime('%d/%m/%Y')}"])
    writer.writerow(["รายรับสะสมรวม (THB)", f"{total_income:,.2f}"])
    writer.writerow(["รายจ่ายสะสมรวม (THB)", f"{total_expense:,.2f}"])
    writer.writerow(["ส่วนต่างกำไรสุทธิ (THB)", f"{net_profit:,.2f}"])
    writer.writerow([])  # Spacer
    
    # ── Section 2: Aggregated Daily Summaries ──
    writer.writerow(["--- ส่วนยอดขายและรายจ่ายรายวัน (Daily Financial Summary) ---"])
    writer.writerow(["วันที่", "รายรับสะสม (บาท)", "รายจ่ายสะสม (บาท)", "กำไรส่วนต่าง (บาท)"])
    
    daily_map = {}
    delta = end - start
    for i in range(delta.days + 1):
        d = start + timedelta(days=i)
        daily_map[d] = {"income": 0.0, "expense": 0.0}
        
    for t in transactions:
        if t.date in daily_map:
            if t.type == "income":
                daily_map[t.date]["income"] += float(t.amount)
            else:
                daily_map[t.date]["expense"] += float(t.amount)
                
    for d in sorted(daily_map.keys()):
        inc = daily_map[d]["income"]
        exp = daily_map[d]["expense"]
        prof = inc - exp
        writer.writerow([d.strftime("%Y-%m-%d"), f"{inc:.2f}", f"{exp:.2f}", f"{prof:.2f}"])
        
    writer.writerow([])  # Spacer
    
    # ── Section 3: Raw Transaction Ledger Details ──
    writer.writerow(["--- ส่วนรายการธุรกรรมโดยละเอียด (Transaction Ledger Detail) ---"])
    writer.writerow(["ลำดับ", "วันที่", "ประเภทธุรกรรม", "รายการสินค้า/บริการ", "จำนวนเงิน (บาท)", "หมวดหมู่บัญชี", "บันทึกช่วยจำ"])
    
    for idx, t in enumerate(transactions, 1):
        t_type = "รายรับ (+)" if t.type == "income" else "รายจ่าย (-)"
        cat_name = t.category.name if t.category else "อื่นๆ"
        note_str = t.note if t.note else ""
        writer.writerow([
            idx,
            t.date.strftime("%Y-%m-%d"),
            t_type,
            t.title,
            f"{t.amount:.2f}",
            cat_name,
            note_str
        ])
        
    # Retrieve contents and inject UTF-8 BOM bytes
    csv_text = output.getvalue()
    csv_bytes = b"\xef\xbb\xbf" + csv_text.encode("utf-8")
    
    response_stream = io.BytesIO(csv_bytes)
    filename = f"udash_financial_report_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        response_stream,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
