Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TeeTime Social - Install & Run" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

# Check for both debug and release APKs
$debugApk = "TTSGolfApp\android\app\build\outputs\apk\debug\app-debug.apk"
$releaseApk = "TTSGolfApp\android\app\build\outputs\apk\release\app-release.apk"

$apkPath = $null
$buildType = $null

if (Test-Path $releaseApk) {
    $apkPath = $releaseApk
    $buildType = "PRODUCTION"
} elseif (Test-Path $debugApk) {
    $apkPath = $debugApk
    $buildType = "DEVELOPMENT"
} else {
    Write-Host "ERROR: No APK found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please build first:" -ForegroundColor Yellow
    Write-Host "  Development: .\scripts\build.ps1 --dev" -ForegroundColor White
    Write-Host "  Production:  .\scripts\build.ps1 --prod" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Found $buildType APK" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Checking for running emulators..." -ForegroundColor Yellow
Write-Host ""
adb devices
Write-Host ""

$devices = adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "WARNING: No emulator detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start your Android emulator first:"
    Write-Host "Run: .\scripts\start-emulator.ps1"
    Write-Host ""
    Read-Host "Press Enter after starting emulator"
    Write-Host ""
    adb devices
    Write-Host ""
}

Write-Host "Step 2: Uninstalling old version (if exists)..." -ForegroundColor Yellow
adb uninstall com.teetimesocial.app 2>$null
Write-Host ""

Write-Host "Step 3: Installing APK on emulator..." -ForegroundColor Green
Write-Host ""
adb install $apkPath

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "1. Make sure emulator is running (adb devices should show 'device')"
    Write-Host "2. Try: adb kill-server && adb start-server"
    Write-Host "3. Restart emulator"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 4: Launching app..." -ForegroundColor Green
Write-Host ""
adb shell am start -n com.teetimesocial.app/.MainActivity

Write-Host ""
Write-Host "Step 5: Starting log viewer..." -ForegroundColor Green
Write-Host ""
Write-Host "Showing app logs (Press Ctrl+C to stop):" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Clear logcat and show only app logs
adb logcat -c
adb logcat | Select-String -Pattern "ReactNative|TeeTime|Expo|Firebase|OAuth|Error|Exception" -CaseSensitive:$false

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "App is running on emulator!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:"
Write-Host "- View all logs: adb logcat"
Write-Host "- Clear logs: adb logcat -c"
Write-Host "- Uninstall: adb uninstall com.teetimesocial.app"
Write-Host "- Restart app: adb shell am start -n com.teetimesocial.app/.MainActivity"
Write-Host ""
Read-Host "Press Enter to exit"
