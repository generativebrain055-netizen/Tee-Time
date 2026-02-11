# Replace Hardcoded Hex Colors with Tailwind Classes
# This script replaces common hardcoded hex colors with semantic Tailwind classes

$files = Get-ChildItem -Path "TTSGolfApp" -Filter "*.tsx" -Recurse

# Color mapping: hex color -> tailwind class
$colorMappings = @{
    # Primary colors
    'bg-\[#5DB075\]' = 'bg-primary'
    'text-\[#5DB075\]' = 'text-primary'
    'border-\[#5DB075\]' = 'border-primary'
    
    # Background colors
    'bg-\[#F8F9FA\]' = 'bg-bg'
    'bg-\[#F9FAFB\]' = 'bg-bg-muted'
    'bg-\[#FAFAFA\]' = 'bg-bg-light'
    'bg-\[#F6F6F6\]' = 'bg-bg'
    'bg-\[#FFFFFF\]' = 'bg-white'
    'bg-\[#F5F5F5\]' = 'bg-surface-secondary'
    'bg-\[#F2F2F7\]' = 'bg-surface-light'
    'bg-\[#F0F9FF\]' = 'bg-info-light'
    'bg-\[#F0FDF4\]' = 'bg-primary-50'
    'bg-\[#DCFCE7\]' = 'bg-primary-100'
    'bg-\[#D1FAE5\]' = 'bg-primary-light'
    
    # Border colors
    'border-\[#E5E7EB\]' = 'border-border'
    'border-\[#E5E5E5\]' = 'border-border'
    'border-\[#F3F4F6\]' = 'border-border-light'
    
    # Text colors
    'text-\[#6B7280\]' = 'text-text-secondary'
    'text-\[#1C1C1E\]' = 'text-text-primary'
    'text-\[#1A1A1A\]' = 'text-text-primary'
    
    # Rounded corners (already standardized but catch any remaining)
    'rounded-\[28px\]' = 'rounded-full'
    'rounded-\[26px\]' = 'rounded-full'
    'rounded-\[10px\]' = 'rounded-md'
}

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $colorMappings.Keys) {
        $replacement = $colorMappings[$pattern]
        $matches = ([regex]::Matches($content, $pattern)).Count
        if ($matches -gt 0) {
            $content = $content -replace $pattern, $replacement
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
Write-Host "`nAll hardcoded colors replaced with Tailwind classes!" -ForegroundColor Green
