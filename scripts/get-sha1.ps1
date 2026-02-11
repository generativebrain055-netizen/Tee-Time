Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TeeTime Social - Get SHA-1 Fingerprints" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

$keytoolPath = "C:\Program Files\Java\jdk-21\bin\keytool.exe"
$debugKeystore = "TTSGolfApp\android\app\debug.keystore"
$releaseKeystore = "TTSGolfApp\android\app\teetimesocial-release.keystore"

Write-Host "Getting SHA-1 fingerprints for Firebase/Google Cloud Console..." -ForegroundColor Yellow
Write-Host ""

# Debug Keystore
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DEBUG KEYSTORE (for development builds)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $debugKeystore) {
    Write-Host "Keystore: $debugKeystore" -ForegroundColor Green
    Write-Host ""
    & $keytoolPath -list -v -keystore $debugKeystore -alias androiddebugkey -storepass android -keypass android | Select-String "SHA1:|SHA256:"
    Write-Host ""
} else {
    Write-Host "Debug keystore not found at: $debugKeystore" -ForegroundColor Red
    Write-Host ""
}

# Release Keystore
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RELEASE KEYSTORE (for production builds)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $releaseKeystore) {
    Write-Host "Keystore: $releaseKeystore" -ForegroundColor Green
    Write-Host ""
    & $keytoolPath -list -v -keystore $releaseKeystore -alias teetimesocial-key-alias -storepass teetimesocial2024 -keypass teetimesocial2024 | Select-String "SHA1:|SHA256:"
    Write-Host ""
} else {
    Write-Host "Release keystore not found at: $releaseKeystore" -ForegroundColor Red
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Yellow
Write-Host "IMPORTANT: Add BOTH SHA-1 fingerprints to:" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Firebase Console:" -ForegroundColor Cyan
Write-Host "   https://console.firebase.google.com/project/teetime-db29d/settings/general" -ForegroundColor White
Write-Host "   → Your apps → Android app → Add fingerprint" -ForegroundColor White
Write-Host ""
Write-Host "2. Google Cloud Console:" -ForegroundColor Cyan
Write-Host "   https://console.cloud.google.com/apis/credentials?project=teetime-db29d" -ForegroundColor White
Write-Host "   → OAuth 2.0 Client IDs → Android client → Add SHA-1" -ForegroundColor White
Write-Host ""
Write-Host "You need to add BOTH debug and release SHA-1 fingerprints!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
