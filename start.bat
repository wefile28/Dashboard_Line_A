@echo off
title Dashboard + LINE Notification System
echo ===================================================
echo   Dashboard + LINE Notification System (Next.js + Python)
echo ===================================================
echo.
echo Starting Backend (FastAPI)...
start "Dashboard Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

echo Starting Frontend (Next.js)...
start "Dashboard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   System is launching!
echo   - Backend: http://localhost:8000 (API & Docs)
echo   - Frontend: http://localhost:3000 (Dashboard)
echo ===================================================
echo.
pause
