# Standardize Rounded Corners to rounded-md
# This script replaces all rounded-lg, rounded-xl, rounded-2xl, rounded-3xl with rounded-md

$files = Get-ChildItem -Path "TTSGolfApp" -Filter "*.tsx" -Recurse

$replacements = @{
    'rounded-lg' = 'rounded-md'
    'rounded-xl' = 'rounded-md'
    'rounded-2xl' = 'rounded-md'
    'rounded-3xl' = 'rounded-md'
}

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        $matches = ([regex]::Matches($content, $old)).Count
        if ($matches -gt 0) {
            $content = $content -replace $old, $new
            $fileReplacements += $matches
        }
    }
    
    if ($fileReplacements -gt 0) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $totalReplacements += $fileReplacements
        Write-Host "Updated $($file.Name): $fileReplacements replacements" -ForegroundColor Green
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Files updated: $totalFiles" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow
Write-Host "`nAll rounded corners standardized to rounded-md!" -ForegroundColor Green
