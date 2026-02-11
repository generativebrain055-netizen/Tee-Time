Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Cleaning Up Console Logs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

Write-Host "Removing excessive debug console.log statements..." -ForegroundColor Yellow
Write-Host ""

# Files with excessive logging that should be cleaned
$filesToClean = @(
    "TTSGolfApp/screens/profile/ScanQRScreen.tsx",
    "TTSGolfApp/screens/profile/EditProfileScreen.tsx",
    "TTSGolfApp/screens/profile/index.tsx",
    "TTSGolfApp/screens/onboarding/OnboardingScreen.tsx",
    "TTSGolfApp/screens/onboarding/PreferencesPage.tsx"
)

$cleaned = 0

foreach ($file in $filesToClean) {
    if (Test-Path $file) {
        Write-Host "  Cleaning: $file" -ForegroundColor White
        $cleaned++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Summary" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production logging strategy:" -ForegroundColor Yellow
Write-Host "  ✅ console.error() - Keep for errors" -ForegroundColor Green
Write-Host "  ✅ console.warn() - Keep for warnings" -ForegroundColor Green
Write-Host "  ❌ console.log() - Remove debug logs" -ForegroundColor Red
Write-Host "  ❌ console.info() - Remove info logs" -ForegroundColor Red
Write-Host ""
Write-Host "Use logger utility instead:" -ForegroundColor Cyan
Write-Host "  import { logger } from '@/utils/logger';" -ForegroundColor White
Write-Host "  logger.error('message', error)  // Always logged" -ForegroundColor White
Write-Host "  logger.warn('message')          // Production" -ForegroundColor White
Write-Host "  logger.info('message')          // Dev only" -ForegroundColor White
Write-Host "  logger.debug('message')         // Dev only" -ForegroundColor White
Write-Host ""
Write-Host "Files checked: $($filesToClean.Count)" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
