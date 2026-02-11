# Comment Density Optimization Script
# Converts verbose JSDoc comments to concise 1-line comments
# Target: ~15% comment density

Write-Host "Optimizing comment density across backend and frontend..." -ForegroundColor Cyan

$patterns = @(
    # Pattern 1: Multi-line JSDoc with single description
    @{
        Pattern = '/\*\*\s*\n\s*\*\s*([^\n]+)\s*\n\s*\*/'
        Replacement = '// $1'
    },
    # Pattern 2: JSDoc with @param, @returns etc - convert to inline
    @{
        Pattern = '/\*\*\s*\n\s*\*\s*([^\n@]+)\s*\n\s*\*\s*@[^\*]+\*/'
        Replacement = '// $1'
    },
    # Pattern 3: Simple multi-line comment blocks
    @{
        Pattern = '/\*\s*\n\s*\*\s*([^\n]+)\s*\n\s*\*/'
        Replacement = '// $1'
    }
)

# Get all JS/TS/TSX files
$backendFiles = Get-ChildItem -Path "backend" -Include "*.js" -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules" }
$frontendFiles = Get-ChildItem -Path "TTSGolfApp" -Include "*.ts","*.tsx" -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules" }

$allFiles = $backendFiles + $frontendFiles
$totalFiles = $allFiles.Count
$processedFiles = 0
$modifiedFiles = 0

Write-Host "Found $totalFiles files to process" -ForegroundColor Yellow

foreach ($file in $allFiles) {
    $processedFiles++
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\')
    
    Write-Progress -Activity "Optimizing Comments" -Status "Processing $relativePath" -PercentComplete (($processedFiles / $totalFiles) * 100)
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $modified = $false
    
    # Apply patterns
    foreach ($pattern in $patterns) {
        if ($content -match $pattern.Pattern) {
            $content = $content -replace $pattern.Pattern, $pattern.Replacement
            $modified = $true
        }
    }
    
    # Save if modified
    if ($modified -and $content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $modifiedFiles++
        Write-Host "  ✓ $relativePath" -ForegroundColor Green
    }
}

Write-Progress -Activity "Optimizing Comments" -Completed

Write-Host "`nComment optimization complete!" -ForegroundColor Cyan
Write-Host "  Total files processed: $processedFiles" -ForegroundColor White
Write-Host "  Files modified: $modifiedFiles" -ForegroundColor Green
Write-Host "`nNote: Manual review recommended for complex logic comments" -ForegroundColor Yellow
