# 企业管理系统功能演示截图脚本
# 使用 PowerShell 和 Windows 自带工具

param(
    [string]$OutputDir = "$PSScriptRoot\screenshots"
)

# 创建输出目录
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  企业管理系统功能演示截图工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "此脚本将引导你完成以下截图：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. 登录页面（深色模式）"
Write-Host "  2. 登录页面（浅色模式）"
Write-Host "  3. 登录过程 - 输入账号"
Write-Host "  4. 登录过程 - 输入密码"
Write-Host "  5. 登录成功 - 首页概览"
Write-Host "  6. 首页 - 切换到浅色模式"
Write-Host "  7. 用户管理页面"
Write-Host "  8. 用户管理 - 新增用户弹窗"
Write-Host "  9. 部门架构页面"
Write-Host " 10. 角色权限页面"
Write-Host " 11. 退出登录菜单"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "请确保 Edge 浏览器已打开 http://localhost:8888/login.html，然后按 Enter 开始"

# 截图函数
function Take-Screenshot {
    param(
        [string]$FileName,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "准备截图: $Description" -ForegroundColor Green
    Read-Host "调整好页面后按 Enter 截图"
    
    $filePath = Join-Path $OutputDir "$FileName.png"
    
    # 使用 Windows 截图工具 (Win+Shift+S) 的替代方案
    # 使用 .NET 的 Graphics 类截图
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "已保存: $filePath" -ForegroundColor Cyan
}

# 执行截图
Take-Screenshot "01_login_dark" "登录页面 - 深色模式"
Take-Screenshot "02_login_light" "登录页面 - 浅色模式（点击主题切换按钮）"
Take-Screenshot "03_login_input" "登录 - 输入账号 admin"
Take-Screenshot "04_login_password" "登录 - 输入密码 admin123"
Take-Screenshot "05_dashboard" "登录成功 - 首页概览"
Take-Screenshot "06_dashboard_light" "首页 - 浅色模式"
Take-Screenshot "07_user_management" "用户管理页面"
Take-Screenshot "08_user_add" "用户管理 - 点击新增用户"
Take-Screenshot "09_department" "部门架构页面"
Take-Screenshot "10_role_permission" "角色权限页面"
Take-Screenshot "11_logout_menu" "点击用户名显示退出菜单"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  所有截图已完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "截图保存在: $OutputDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "你可以使用以下工具将截图合成为 GIF：" -ForegroundColor Cyan
Write-Host "  - ScreenToGif (免费): https://www.screentogif.com/"
Write-Host "  - 在线工具: https://ezgif.com/maker"
Write-Host ""
Read-Host "按 Enter 退出"
