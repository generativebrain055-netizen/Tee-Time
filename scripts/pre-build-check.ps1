#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pre-build validation script for TeeTimeApp
.DESCRIPTION
    Runs comprehensive checks before building to catch errors early
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$script:ErrorCount = 0
$script:WarningCount = 0

function Write-StatusHeader {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:ErrorCount++
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:WarningCount++
}

function Test-TypeScript {
    Write-StatusHeader "Checking TypeScript Compilation"
    
    Push-Location "$PSScriptRoot\..\TTSGolfApp"
    try {
        $output = npx tsc --noEmit 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "TypeScript compilation successful"
            return $true
        } else {
            Write-Error "TypeScript compilation failed"
            if ($Verbose) {
                Write-Host $output -ForegroundColor Red
            }
            return $false
        }
    } finally {
        Pop-Location
    }
}

function Test-JsonFiles {
    Write-StatusHeader "Validating JSON Files"
    
    $jsonFiles = @(
        "TTSGolfApp\package.json",
        "TTSGolfApp\app.json",
        "TTSGolfApp\tsconfig.json",
        "backend\package.json"
    )
    
    $allValid = $true
    foreach ($file in $jsonFiles) {
        $fullPath = Join-Path $PSScriptRoot "..\$file"
        if (Test-Path $fullPath) {
            try {
                $null = Get-Content $fullPath -Raw | ConvertFrom-Json
                Write-Success "Valid JSON: $file"
            } catch {
                Write-Error "Invalid JSON: $file - $($_.Exception.Message)"
                $allValid = $false
            }
        } else {
            Write-Warning "JSON file not found: $file"
        }
    }
    
    return $allValid
}

function Test-BackendSyntax {
    Write-StatusHeader "Checking Backend JavaScript Syntax"
    
    $serverFile = "$PSScriptRoot\..\backend\server.js"
    if (Test-Path $serverFile) {
        node --check $serverFile 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend syntax check passed"
            return $true
        } else {
            Write-Error "Backend syntax errors found"
            return $false
        }
    } else {
        Write-Warning "Backend server.js not found"
        return $false
    }
}

function Test-Dependencies {
    Write-StatusHeader "Checking Dependencies"
    
    Push-Location "$PSScriptRoot\..\TTSGolfApp"
    try {
        if (Test-Path "node_modules") {
            Write-Success "Node modules exist"
            
            # Check for critical dependencies
            $critical = @(
                "react",
                "react-native",
                "expo"
            )
            
            $allFound = $true
            foreach ($dep in $critical) {
                if (Test-Path "node_modules\$dep") {
                    Write-Success "Found: $dep"
                } else {
                    Write-Error "Missing critical dependency: $dep"
                    $allFound = $false
                }
            }
            
            return $allFound
        } else {
            Write-Error "Node modules not installed. Run 'npm install' first."
            return $false
        }
    } finally {
        Pop-Location
    }
}

function Test-EnvironmentVariables {
    Write-StatusHeader "Checking Environment Configuration"
    
    $envFile = "$PSScriptRoot\..\.env"
    if (Test-Path $envFile) {
        Write-Success ".env file exists"
        
        # Check for critical env vars
        $envContent = Get-Content $envFile -Raw
        $criticalVars = @(
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY"
        )
        
        $allFound = $true
        foreach ($var in $criticalVars) {
            if ($envContent -match "^$var=.+$" -or $envContent -match "`n$var=.+$") {
                Write-Success "Found: $var"
            } else {
                Write-Warning "Missing or empty: $var"
                $allFound = $false
            }
        }
        
        return $allFound
    } else {
        Write-Warning ".env file not found"
        return $false
    }
}

function Test-ExpoDiagnostics {
    Write-StatusHeader "Running Expo Diagnostics"
    
    Push-Location "$PSScriptRoot\..\TTSGolfApp"
    try {
        $output = npx expo-doctor 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Expo diagnostics passed"
            if ($Verbose) {
                Write-Host $output
            }
            return $true
        } else {
            Write-Warning "Expo diagnostics found issues"
            if ($Verbose) {
                Write-Host $output -ForegroundColor Yellow
            }
            return $false
        }
    } finally {
        Pop-Location
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Host @"

╔═══════════════════════════════════════════════╗
║                                               ║
║        TeeTimeApp Pre-Build Check             ║
║                                               ║
╚═══════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$startTime = Get-Date

# Run all checks
$results = @{
    "JSON Files" = Test-JsonFiles
    "TypeScript" = Test-TypeScript
    "Backend Syntax" = Test-BackendSyntax
    "Dependencies" = Test-Dependencies
    "Environment" = Test-EnvironmentVariables
    "Expo Diagnostics" = Test-ExpoDiagnostics
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

# Summary
Write-StatusHeader "Summary"

$passedChecks = ($results.Values | Where-Object { $_ -eq $true }).Count
$totalChecks = $results.Count

Write-Host "Passed: $passedChecks/$totalChecks checks" -ForegroundColor $(if ($passedChecks -eq $totalChecks) { "Green" } else { "Yellow" })
Write-Host "Errors: $script:ErrorCount" -ForegroundColor $(if ($script:ErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings: $script:WarningCount" -ForegroundColor $(if ($script:WarningCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "Duration: $([math]::Round($duration, 2))s" -ForegroundColor Cyan

if ($script:ErrorCount -eq 0 -and $passedChecks -eq $totalChecks) {
    Write-Host "`n✓ All checks passed! Ready to build. 🚀`n" -ForegroundColor Green
    exit 0
} elseif ($script:ErrorCount -eq 0) {
    Write-Host "`n⚠ Some checks had warnings. Review before building.`n" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n✗ Build check failed. Please fix errors before building.`n" -ForegroundColor Red
    exit 1
}
