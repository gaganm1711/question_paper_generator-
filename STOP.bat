@echo off
title Stop Question Paper Generator
color 0C

echo.
echo  Stopping Maharashtra Board Question Paper Generator...
echo.

:: Kill Python backend (uvicorn)
taskkill /F /IM python.exe /T >nul 2>&1
echo  [1/2] Backend stopped.

:: Kill Node frontend (Next.js)
taskkill /F /IM node.exe /T >nul 2>&1
echo  [2/2] Frontend stopped.

echo.
echo  All services stopped successfully.
echo.
timeout /t 2 /nobreak >nul
