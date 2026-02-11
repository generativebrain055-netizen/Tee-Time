Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TeeTime Social - Setup Verification" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

$errors = @()
$warnings = @()
$success = @()

# ============================================================================
# 1. Check Keystores and SHA-1
# ============================================================================
Write-Host "1. Checking Keystores..." -ForegroundColor Yellow
Write-Host ""

$keytoolPath = "C:\Program Files\Java\jdk-21\bin\keytool.exe"
$debugKeystore = "TTSGolfApp\android\app\debug.keystore"
$releaseKeystore = "TTSGolfApp\android\app\teetimesocial-release.keystore"

$debugSha1 = $null
$releaseSha1 = $null

if (Test-Path $debugKeystore) {
    try {
        $debugSha1Output = & $keytoolPath -list -v -keystore $debugKeystore -alias androiddebugkey -storepass android -keypass android 2>$null | Select-String "SHA1:"
        $debugSha1 = ($debugSha1Output -replace ".*SHA1:\s*", "").Trim().ToLower().Replace(":", "")
        Write-Host "  ✅ Debug keystore found" -ForegroundColor Green
        Write-Host "     SHA-1: $debugSha1" -ForegroundColor Cyan
        $success += "Debug keystore exists"
    } catch {
        $errors += "Failed to read debug keystore"
        Write-Host "  ❌ Failed to read debug keystore" -ForegroundColor Red
    }
} else {
    $errors += "Debug keystore not found"
    Write-Host "  ❌ Debug keystore not found at: $debugKeystore" -ForegroundColor Red
}

if (Test-Path $releaseKeystore) {
    try {
        $releaseSha1Output = & $keytoolPath -list -v -keystore $releaseKeystore -alias teetimesocial-key-alias -storepass teetimesocial2024 -keypass teetimesocial2024 2>$null | Select-String "SHA1:"
        $releaseSha1 = ($releaseSha1Output -replace ".*SHA1:\s*", "").Trim().ToLower().Replace(":", "")
        Write-Host "  ✅ Release keystore found" -ForegroundColor Green
        Write-Host "     SHA-1: $releaseSha1" -ForegroundColor Cyan
        $success += "Release keystore exists"
    } catch {
        $warnings += "Failed to read release keystore"
        Write-Host "  ⚠️  Failed to read release keystore" -ForegroundColor Yellow
    }
} else {
    $warnings += "Release keystore not found (optional for dev)"
    Write-Host "  ⚠️  Release keystore not found (OK for development)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 2. Check google-services.json
# ============================================================================
Write-Host "2. Checking google-services.json..." -ForegroundColor Yellow
Write-Host ""

$googleServicesPath = "TTSGolfApp\google-services.json"
if (Test-Path $googleServicesPath) {
    try {
        $googleServices = Get-Content $googleServicesPath -Raw | ConvertFrom-Json
        
        $projectId = $googleServices.project_info.project_id
        $packageName = $googleServices.client[0].client_info.android_client_info.package_name
        $androidClient = $googleServices.client[0].oauth_client | Where-Object { $_.client_type -eq 1 }
        $webClient = $googleServices.client[0].oauth_client | Where-Object { $_.client_type -eq 3 }
        $certHash = $androidClient.android_info.certificate_hash
        
        Write-Host "  ✅ File exists and is valid JSON" -ForegroundColor Green
        Write-Host "     Project ID: $projectId" -ForegroundColor Cyan
        Write-Host "     Package: $packageName" -ForegroundColor Cyan
        Write-Host "     Android Client ID: $($androidClient.client_id)" -ForegroundColor Cyan
        Write-Host "     Web Client ID: $($webClient.client_id)" -ForegroundColor Cyan
        Write-Host "     Certificate Hash: $certHash" -ForegroundColor Cyan
        
        # Verify package name
        if ($packageName -eq "com.teetimesocial.app") {
            $success += "Package name is correct"
        } else {
            $errors += "Package name mismatch: $packageName"
            Write-Host "  ❌ Package name should be: com.teetimesocial.app" -ForegroundColor Red
        }
        
        # Compare SHA-1 with debug keystore
        if ($debugSha1 -and $certHash) {
            if ($debugSha1 -eq $certHash) {
                Write-Host "  ✅ Certificate hash MATCHES debug keystore SHA-1" -ForegroundColor Green
                $success += "SHA-1 matches debug keystore"
            } else {
                $errors += "SHA-1 mismatch between google-services.json and debug keystore"
                Write-Host "  ❌ Certificate hash DOES NOT MATCH debug keystore" -ForegroundColor Red
                Write-Host "     Expected: $debugSha1" -ForegroundColor Yellow
                Write-Host "     Got:      $certHash" -ForegroundColor Yellow
                Write-Host "     ACTION: Add debug SHA-1 to Firebase Console and re-download google-services.json" -ForegroundColor Red
            }
        }
        
    } catch {
        $errors += "Failed to parse google-services.json"
        Write-Host "  ❌ Failed to parse JSON: $_" -ForegroundColor Red
    }
} else {
    $errors += "google-services.json not found"
    Write-Host "  ❌ File not found at: $googleServicesPath" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 3. Check .env files
# ============================================================================
Write-Host "3. Checking Environment Files..." -ForegroundColor Yellow
Write-Host ""

# Mobile .env
$mobileEnvPath = "TTSGolfApp\.env"
if (Test-Path $mobileEnvPath) {
    $mobileEnv = Get-Content $mobileEnvPath -Raw
    
    Write-Host "  Mobile App (.env):" -ForegroundColor Cyan
    
    # Check API URL
    if ($mobileEnv -match "EXPO_PUBLIC_API_URL=(.+)") {
        $apiUrl = $matches[1].Trim()
        Write-Host "    API URL: $apiUrl" -ForegroundColor White
        if ($apiUrl -match "http://192\.168\.\d+\.\d+:3000") {
            $success += "API URL configured"
        } else {
            $warnings += "API URL might be incorrect"
            Write-Host "    ⚠️  Make sure this matches your local IP" -ForegroundColor Yellow
        }
    } else {
        $errors += "API URL not found in mobile .env"
        Write-Host "    ❌ EXPO_PUBLIC_API_URL not found" -ForegroundColor Red
    }
    
    # Check Firebase config
    if ($mobileEnv -match "EXPO_PUBLIC_FIREBASE_PROJECT_ID=(.+)") {
        $firebaseProjectId = $matches[1].Trim()
        Write-Host "    Firebase Project: $firebaseProjectId" -ForegroundColor White
        
        if ($googleServices -and $firebaseProjectId -eq $googleServices.project_info.project_id) {
            $success += "Firebase project ID matches"
        } else {
            $errors += "Firebase project ID mismatch"
            Write-Host "    ❌ Project ID doesn't match google-services.json" -ForegroundColor Red
        }
    }
    
    # Check Google Web Client ID
    if ($mobileEnv -match "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=(.+)") {
        $webClientId = $matches[1].Trim()
        Write-Host "    Google Web Client ID: $webClientId" -ForegroundColor White
        
        if ($webClient -and $webClientId -eq $webClient.client_id) {
            $success += "Google Web Client ID matches"
        } else {
            $errors += "Google Web Client ID mismatch"
            Write-Host "    ❌ Web Client ID doesn't match google-services.json" -ForegroundColor Red
        }
    }
    
    Write-Host ""
} else {
    $errors += "Mobile .env not found"
    Write-Host "  ❌ Mobile .env not found at: $mobileEnvPath" -ForegroundColor Red
}

# Backend .env
$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    $backendEnv = Get-Content $backendEnvPath -Raw
    
    Write-Host "  Backend (.env):" -ForegroundColor Cyan
    
    # Check Firebase Project ID
    if ($backendEnv -match "FIREBASE_PROJECT_ID=(.+)") {
        $backendFirebaseId = $matches[1].Trim()
        Write-Host "    Firebase Project: $backendFirebaseId" -ForegroundColor White
        
        if ($googleServices -and $backendFirebaseId -eq $googleServices.project_info.project_id) {
            $success += "Backend Firebase project ID matches"
        } else {
            $errors += "Backend Firebase project ID mismatch"
            Write-Host "    ❌ Project ID doesn't match google-services.json" -ForegroundColor Red
        }
    }
    
    # Check Supabase
    if ($backendEnv -match "SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
        Write-Host "    Supabase URL: $supabaseUrl" -ForegroundColor White
        $success += "Supabase configured"
    } else {
        $errors += "Supabase URL not found"
        Write-Host "    ❌ SUPABASE_URL not found" -ForegroundColor Red
    }
    
    Write-Host ""
} else {
    $errors += "Backend .env not found"
    Write-Host "  ❌ Backend .env not found at: $backendEnvPath" -ForegroundColor Red
}

# ============================================================================
# 4. Check app.json
# ============================================================================
Write-Host "4. Checking app.json..." -ForegroundColor Yellow
Write-Host ""

$appJsonPath = "TTSGolfApp\app.json"
if (Test-Path $appJsonPath) {
    try {
        $appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
        
        $packageName = $appJson.expo.android.package
        $bundleId = $appJson.expo.ios.bundleIdentifier
        
        Write-Host "  ✅ File exists and is valid JSON" -ForegroundColor Green
        Write-Host "     Android Package: $packageName" -ForegroundColor Cyan
        Write-Host "     iOS Bundle ID: $bundleId" -ForegroundColor Cyan
        
        if ($packageName -eq "com.teetimesocial.app") {
            $success += "Android package name correct"
        } else {
            $errors += "Android package name incorrect"
            Write-Host "  ❌ Android package should be: com.teetimesocial.app" -ForegroundColor Red
        }
        
        if ($bundleId -eq "com.teetimesocial.app") {
            $success += "iOS bundle ID correct"
        } else {
            $errors += "iOS bundle ID incorrect"
            Write-Host "  ❌ iOS bundle ID should be: com.teetimesocial.app" -ForegroundColor Red
        }
        
    } catch {
        $errors += "Failed to parse app.json"
        Write-Host "  ❌ Failed to parse JSON: $_" -ForegroundColor Red
    }
} else {
    $errors += "app.json not found"
    Write-Host "  ❌ File not found at: $appJsonPath" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 5. Check Android SDK
# ============================================================================
Write-Host "5. Checking Android SDK..." -ForegroundColor Yellow
Write-Host ""

$androidSdkPath = "C:\Users\dawoo\AppData\Local\Android\Sdk"
if (Test-Path $androidSdkPath) {
    Write-Host "  ✅ Android SDK found at: $androidSdkPath" -ForegroundColor Green
    $success += "Android SDK exists"
    
    # Check local.properties
    $localPropsPath = "TTSGolfApp\android\local.properties"
    if (Test-Path $localPropsPath) {
        $localProps = Get-Content $localPropsPath -Raw
        if ($localProps -match "sdk.dir") {
            Write-Host "  ✅ local.properties configured" -ForegroundColor Green
            $success += "local.properties exists"
        } else {
            $warnings += "local.properties missing sdk.dir"
            Write-Host "  ⚠️  local.properties missing sdk.dir" -ForegroundColor Yellow
        }
    } else {
        $warnings += "local.properties not found"
        Write-Host "  ⚠️  local.properties not found (will be created on build)" -ForegroundColor Yellow
    }
} else {
    $errors += "Android SDK not found"
    Write-Host "  ❌ Android SDK not found at: $androidSdkPath" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 6. Check Node Modules
# ============================================================================
Write-Host "6. Checking Dependencies..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "TTSGolfApp\node_modules") {
    Write-Host "  ✅ Mobile app dependencies installed" -ForegroundColor Green
    $success += "Mobile dependencies installed"
} else {
    $warnings += "Mobile dependencies not installed"
    Write-Host "  ⚠️  Mobile app dependencies not installed (will install on build)" -ForegroundColor Yellow
}

if (Test-Path "backend\node_modules") {
    Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green
    $success += "Backend dependencies installed"
} else {
    $warnings += "Backend dependencies not installed"
    Write-Host "  ⚠️  Backend dependencies not installed" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Successes: $($success.Count)" -ForegroundColor Green
Write-Host "⚠️  Warnings: $($warnings.Count)" -ForegroundColor Yellow
Write-Host "❌ Errors: $($errors.Count)" -ForegroundColor Red
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "ERRORS (must fix before building):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS (should review):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

# ============================================================================
# Final Verdict
# ============================================================================
if ($errors.Count -eq 0) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ READY TO BUILD!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Build: .\scripts\build.ps1 --dev" -ForegroundColor White
    Write-Host "2. Start backend: .\scripts\start-backend.ps1" -ForegroundColor White
    Write-Host "3. Start emulator: .\scripts\start-emulator.ps1" -ForegroundColor White
    Write-Host "4. Run: .\scripts\run.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "❌ NOT READY - FIX ERRORS FIRST" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SHA-1 Mismatch:" -ForegroundColor Cyan
    Write-Host "  1. Go to Firebase Console" -ForegroundColor White
    Write-Host "  2. Add your debug SHA-1: $debugSha1" -ForegroundColor White
    Write-Host "  3. Download new google-services.json" -ForegroundColor White
    Write-Host "  4. Replace TTSGolfApp\google-services.json" -ForegroundColor White
    Write-Host "  5. Run this script again" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to exit"
