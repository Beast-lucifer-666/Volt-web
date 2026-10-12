@echo off
cd /d "%~dp0"
echo ===================================================
echo   ⚡ Starting Volt Smart Energy Dashboard (React)
echo ===================================================
echo   Access in browser: http://localhost:5173
echo ===================================================
call npm.cmd run dev
pause
