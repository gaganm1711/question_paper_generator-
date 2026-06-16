@echo off
title Maharashtra Board Question Paper Generator
color 0A

echo.
echo  =====================================================
echo    Maharashtra State Board Question Paper Generator
echo  =====================================================
echo.
echo  Starting services... Please wait.
echo.

:: Start Backend (FastAPI on port 8080) in a new window
echo  [1/2] Starting Backend API (port 8080)...
start "QPG Backend" cmd /k "cd /d "%~dp0" && python -m backend.app.main"

:: Wait ~4 seconds for backend to initialize (using ping as a timer)
ping -n 5 127.0.0.1 >nul

:: Start Frontend (Next.js on port 3005) in a new window
echo  [2/2] Starting Frontend (port 3005)...
start "QPG Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait ~6 seconds for frontend to boot
echo.
echo  Waiting for frontend to be ready...
ping -n 8 127.0.0.1 >nul

:: Open in default browser
echo  Opening browser...
start "" "http://localhost:3005"

echo.
echo  =====================================================
echo   App is running!  Open: http://localhost:3005
echo.
echo   To stop: close the "QPG Backend" and
echo            "QPG Frontend" windows, or run STOP.bat
echo  =====================================================
echo.
