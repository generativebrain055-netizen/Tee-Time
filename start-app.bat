@echo off
echo ========================================
echo   TeeTime Golf App - Starting...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if backend dependencies are installed
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Check if frontend dependencies are installed
if not exist "TTSGolfApp\node_modules\" (
    echo Installing frontend dependencies...
    cd TTSGolfApp
    call npm install
    cd ..
    echo.
)

echo ========================================
echo   Starting Backend Server...
echo ========================================
echo Backend will run on: http://localhost:3000
echo.
start "TeeTime Backend" cmd /k "cd backend && npm start"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

echo ========================================
echo   Starting Frontend App...
echo ========================================
echo Frontend will open Expo DevTools
echo.
start "TeeTime Frontend" cmd /k "cd TTSGolfApp && npm start"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: Check Expo DevTools window
echo.
echo Press any key to close this window...
echo (Backend and Frontend will keep running)
pause >nul
