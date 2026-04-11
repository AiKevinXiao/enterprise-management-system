# Manual Screenshot Tool
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$OutputDir = "E:\AI Project\企业管理系统\demo-gif"

function Capture-Step {
    param(
        [string]$StepNum,
        [string]$FileName,
        [string]$Description,
        [string]$Action
    )
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step $StepNum`: $Description" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Action: $Action" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Press Enter to capture screenshot"
    
    # Screenshot
    $screen = [System.Windows.Forms.Screen]::AllScreens[0]
    $bounds = $screen.Bounds
    
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $filePath = Join-Path $OutputDir "$FileName.png"
    
    try {
        $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Saved: $FileName.png" -ForegroundColor Green
    } catch {
        Write-Host "Error saving: $_" -ForegroundColor Red
    }
    
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Enterprise Management System" -ForegroundColor Green
Write-Host "  Manual Screenshot Tool" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  1. Open Edge browser" -ForegroundColor White
Write-Host "  2. Go to http://localhost:8888/login.html" -ForegroundColor White
Write-Host "  3. Put browser on primary screen" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter when ready"

# Steps
Capture-Step -StepNum "1" -FileName "01_login_dark" -Description "Login Page - Dark Mode" -Action "Ensure login page is displayed in dark mode"

Capture-Step -StepNum "2" -FileName "02_login_light" -Description "Login Page - Light Mode" -Action "Click theme toggle button (sun icon) to switch to light mode"

Capture-Step -StepNum "3" -FileName "03_login_input" -Description "Login Form" -Action "Type username: admin, password: admin123"

Capture-Step -StepNum "4" -FileName "04_login_submit" -Description "Login Submit" -Action "Click login button"

Capture-Step -StepNum "5" -FileName "05_dashboard" -Description "Dashboard" -Action "Wait for dashboard to load with stat cards"

Capture-Step -StepNum "6" -FileName "06_user_mgmt" -Description "User Management" -Action "Click [User Management] in left sidebar"

Capture-Step -StepNum "7" -FileName "07_user_add_modal" -Description "Add User Modal" -Action "Click [+ Add User] button to show modal"

Capture-Step -StepNum "8" -FileName "08_dept" -Description "Department" -Action "Close modal, click [Department] in sidebar"

Capture-Step -StepNum "9" -FileName "09_role" -Description "Role Permission" -Action "Click [Role Permission] in sidebar"

Capture-Step -StepNum "10" -FileName "10_user_menu" -Description "User Menu" -Action "Click username in header to show logout menu"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All screenshots completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Saved to: $OutputDir" -ForegroundColor Yellow

Read-Host "Press Enter to exit"
