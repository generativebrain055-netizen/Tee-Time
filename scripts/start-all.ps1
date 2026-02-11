#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start all services (emulator, backend, frontend) in separate terminals
.DESCRIPTION
    Launches Firebase emulator, backend server, and frontend app in three separate terminal windows
#>

$ErrorActionPreference = "Stop"

Write-Host "Starting all services in separate terminals..." -ForegroundColor Cyan

# Get the project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot



# 2. Start Backend Server in a new terminal
Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm start"

# Wait a moment before starting the next service
Start-Sleep -Seconds 2

# 3. Start Frontend App in a new terminal
Write-Host "[2/2] Starting Frontend App..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\TTSGolfApp'; npx expo start"

Write-Host "`n✓ All services started in separate terminals!" -ForegroundColor Green
Write-Host "  - Terminal 1: Firebase Emulator" -ForegroundColor Gray
Write-Host "  - Terminal 2: Backend Server" -ForegroundColor Gray
Write-Host "  - Terminal 3: Frontend App" -ForegroundColor Gray
Write-Host "`nPress Ctrl+C in each terminal to stop the respective service." -ForegroundColor Yellow
