# Enterprise Management System Demo GIF Generator
# Using PowerShell + .NET for screenshots

param(
    [string]$OutputDir = "$PSScriptRoot\demo-gif",
    [int]$Delay = 2000
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Enterprise Management System Demo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Capture-Screen {
    param(
        [string]$FileName,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "[$FileName] $Description" -ForegroundColor Green
    Write-Host "Switch to browser in 3 seconds..." -ForegroundColor Yellow
    
    for ($i = 3; $i -gt 0; $i--) {
        Write-Host "$i..." -NoNewline -ForegroundColor Yellow
        Start-Sleep -Milliseconds 1000
    }
    Write-Host "Capture!" -ForegroundColor Green
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $filePath = Join-Path $OutputDir "$FileName.png"
    $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Saved: $filePath" -ForegroundColor Cyan
}

$screenshots = @(
    @{ FileName = "01_login_dark"; Description = "Login page - Dark mode" },
    @{ FileName = "02_login_light"; Description = "Login page - Light mode (click theme toggle)" },
    @{ FileName = "03_login_form"; Description = "Login form with credentials" },
    @{ FileName = "04_dashboard"; Description = "Dashboard after login" },
    @{ FileName = "05_user_mgmt"; Description = "User Management page" },
    @{ FileName = "06_user_add"; Description = "Add User modal" },
    @{ FileName = "07_dept"; Description = "Department page" },
    @{ FileName = "08_role"; Description = "Role Permission page" },
    @{ FileName = "09_logout"; Description = "Logout menu" }
)

Write-Host "Starting capture sequence: $($screenshots.Count) screenshots" -ForegroundColor Yellow
Write-Host ""
Read-Host "Ensure Edge browser is ready at http://localhost:8888/login.html, then press Enter"

foreach ($shot in $screenshots) {
    Capture-Screen -FileName $shot.FileName -Description $shot.Description
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Capture Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Screenshots saved to: $OutputDir" -ForegroundColor Yellow
Write-Host ""

# Generate HTML preview
$html = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Enterprise Management System Demo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; color: #fff; padding: 40px; }
        h1 { text-align: center; margin-bottom: 40px; }
        .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(800px, 1fr)); gap: 30px; }
        .shot { background: #1E293B; border-radius: 12px; overflow: hidden; }
        .shot img { width: 100%; display: block; }
        .shot-title { padding: 16px; font-size: 14px; color: #94A3B8; }
    </style>
</head>
<body>
    <h1>Enterprise Management System Demo</h1>
    <div class="gallery">
"@

foreach ($shot in $screenshots) {
    $imgPath = "$($shot.FileName).png"
    $html += "        <div class='shot'><img src='$imgPath' alt='$($shot.Description)'><div class='shot-title'>$($shot.Description)</div></div>`n"
}

$html += @"
    </div>
</body>
</html>
"@

$htmlPath = Join-Path $OutputDir "index.html"
$html | Out-File -FilePath $htmlPath -Encoding UTF8

Write-Host "Preview page: $htmlPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To create GIF:" -ForegroundColor Green
Write-Host "  1. Use ScreenToGif: https://www.screentogif.com/" -ForegroundColor White
Write-Host "  2. Or online: https://ezgif.com/maker" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to open preview"
Start-Process $htmlPath
