@echo off
echo ========================================
echo   Allow Port 3000 in Windows Firewall
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Adding firewall rule for port 3000...
echo.

REM Remove existing rule if it exists
netsh advfirewall firewall delete rule name="TeeTime Backend Port 3000" >nul 2>&1

REM Add new rule
netsh advfirewall firewall add rule name="TeeTime Backend Port 3000" dir=in action=allow protocol=TCP localport=3000

if %errorLevel% equ 0 (
    echo ✅ SUCCESS: Port 3000 is now allowed in Windows Firewall
    echo.
    echo Your phone should now be able to connect to:
    echo http://192.168.18.103:3000
    echo.
) else (
    echo ❌ ERROR: Failed to add firewall rule
    echo.
)

pause
