Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TeeTime Social - Start Android Emulator" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Try to find emulator in PATH first, fallback to hardcoded path
$emulatorPath = Get-Command emulator -ErrorAction SilentlyContinue
if (-not $emulatorPath) {
    $emulatorPath = "C:\Users\dawoo\AppData\Local\Android\Sdk\emulator\emulator.exe"
    if (-not (Test-Path $emulatorPath)) {
        Write-Host "ERROR: Emulator not found!" -ForegroundColor Red
        Write-Host "Please add Android SDK emulator to PATH or update script."
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    $emulatorPath = $emulatorPath.Source
}

Write-Host "Available emulators:" -ForegroundColor Yellow
& $emulatorPath -list-avds
Write-Host ""

Write-Host "Starting emulator: Pixel_9" -ForegroundColor Green
Write-Host ""
Write-Host "This will open in a new window..."
Write-Host "Wait for emulator to fully boot before installing app."
Write-Host ""

Start-Process $emulatorPath -ArgumentList "-avd", "Pixel_9"

Write-Host "Emulator is starting..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Once emulator is fully booted (you see home screen),"
Write-Host "run: .\scripts\install-and-run.ps1"
Write-Host ""
Read-Host "Press Enter to exit"
