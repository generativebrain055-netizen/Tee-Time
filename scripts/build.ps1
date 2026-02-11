param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Mode = "dev"
)

# Normalize input - remove dashes and convert to lowercase
$Mode = $Mode.ToLower().TrimStart('-')

# Validate mode
if ($Mode -notin @("dev", "prod")) {
    Write-Host "ERROR: Invalid mode '$Mode'" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\build.ps1 dev   or   .\build.ps1 --dev" -ForegroundColor White
    Write-Host "  .\build.ps1 prod  or   .\build.ps1 --prod" -ForegroundColor White
    Write-Host ""
    exit 1
}

$buildType = if ($Mode -eq "prod") { "PRODUCTION" } else { "DEVELOPMENT" }
$gradleTask = if ($Mode -eq "prod") { "assembleRelease" } else { "assembleDebug" }
$apkType = if ($Mode -eq "prod") { "release" } else { "debug" }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TeeTime Social - $buildType Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "Building DEBUG APK with:" -ForegroundColor Yellow
    Write-Host "✅ Error messages visible" -ForegroundColor Green
    Write-Host "✅ React DevTools enabled" -ForegroundColor Green
    Write-Host "✅ Hot reload support" -ForegroundColor Green
    Write-Host "✅ Better debugging" -ForegroundColor Green
} else {
    Write-Host "Building PRODUCTION APK with:" -ForegroundColor Yellow
    Write-Host "✅ Optimized performance" -ForegroundColor Green
    Write-Host "✅ Smaller file size" -ForegroundColor Green
    Write-Host "✅ Production-ready" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to continue"

# Change to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Set ANDROID_HOME for this session
$env:ANDROID_HOME = "C:\Users\dawoo\AppData\Local\Android\Sdk"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Green
Write-Host ""
Set-Location TTSGolfApp
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 2: Running prebuild (generating native Android project)..." -ForegroundColor Green
Write-Host ""
npx expo prebuild --platform android --clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prebuild failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 3: Building $buildType APK..." -ForegroundColor Green
Write-Host ""
Set-Location android
.\gradlew $gradleTask

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Set-Location ..\..
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location ..\..

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "SUCCESS! $buildType APK built!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Location: TTSGolfApp\android\app\build\outputs\apk\$apkType\app-$apkType.apk" -ForegroundColor Yellow
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "This is a DEBUG build with:" -ForegroundColor Cyan
    Write-Host "✅ Error messages visible in app" -ForegroundColor Green
    Write-Host "✅ React DevTools enabled" -ForegroundColor Green
    Write-Host "✅ Better debugging capabilities" -ForegroundColor Green
} else {
    Write-Host "This is a PRODUCTION build with:" -ForegroundColor Cyan
    Write-Host "✅ Optimized performance" -ForegroundColor Green
    Write-Host "✅ Smaller file size" -ForegroundColor Green
    Write-Host "✅ Production-ready" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: .\scripts\start-backend.ps1" -ForegroundColor White
Write-Host "2. Start emulator: .\scripts\start-emulator.ps1" -ForegroundColor White
Write-Host "3. Install & run: .\scripts\run.ps1" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
