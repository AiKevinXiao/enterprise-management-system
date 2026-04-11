# 截取浏览器窗口（支持多显示器）
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Capture-BrowserWindow {
    param(
        [string]$FileName,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "[$FileName] $Description" -ForegroundColor Green
    Write-Host "请在 3 秒内切换到浏览器窗口（副屏）..." -ForegroundColor Yellow
    
    for ($i = 3; $i -gt 0; $i--) {
        Write-Host "$i..." -NoNewline -ForegroundColor Yellow
        Start-Sleep -Milliseconds 1000
    }
    Write-Host "截图!" -ForegroundColor Green
    
    # 获取所有屏幕
    $screens = [System.Windows.Forms.Screen]::AllScreens
    Write-Host "检测到 $($screens.Count) 个显示器" -ForegroundColor Cyan
    
    # 找到包含浏览器窗口的屏幕
    # 通过检查窗口标题来定位 Edge 浏览器
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WindowCapture {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }
    
    public static RECT GetActiveWindowRect() {
        RECT rect;
        IntPtr hwnd = GetForegroundWindow();
        GetWindowRect(hwnd, out rect);
        return rect;
    }
    
    public static string GetActiveWindowTitle() {
        IntPtr hwnd = GetForegroundWindow();
        System.Text.StringBuilder title = new System.Text.StringBuilder(256);
        GetWindowText(hwnd, title, 256);
        return title.ToString();
    }
}
"@
    
    # 获取当前活动窗口的位置
    $windowRect = [WindowCapture]::GetActiveWindowRect()
    $windowTitle = [WindowCapture]::GetActiveWindowTitle()
    
    Write-Host "活动窗口: $windowTitle" -ForegroundColor Gray
    
    $width = $windowRect.Right - $windowRect.Left
    $height = $windowRect.Bottom - $windowRect.Top
    
    # 如果窗口太小，可能是桌面，使用整个副屏
    if ($width -lt 800 -or $height -lt 600) {
        Write-Host "窗口太小，使用副屏全屏截图" -ForegroundColor Yellow
        # 使用第二个屏幕（副屏）
        if ($screens.Count -gt 1) {
            $targetScreen = $screens[1]  # 副屏通常是第二个
        } else {
            $targetScreen = $screens[0]
        }
        $bounds = $targetScreen.Bounds
    } else {
        # 使用窗口区域
        $bounds = New-Object System.Drawing.Rectangle($windowRect.Left, $windowRect.Top, $width, $height)
    }
    
    Write-Host "截图区域: $($bounds.Width) x $($bounds.Height) at ($($bounds.Left), $($bounds.Top))" -ForegroundColor Gray
    
    # 截图
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    # 保存
    $filePath = Join-Path $OutputDir "$FileName.png"
    $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "已保存: $filePath" -ForegroundColor Cyan
}

# 主程序
$OutputDir = "$PSScriptRoot\demo-gif"

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  企业管理系统演示截图工具（双屏版）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请确保：" -ForegroundColor Yellow
Write-Host "  1. Edge 浏览器已打开 http://localhost:8888/login.html" -ForegroundColor White
Write-Host "  2. 浏览器窗口在副屏上" -ForegroundColor White
Write-Host "  3. 浏览器窗口是当前活动窗口" -ForegroundColor White
Write-Host ""

Read-Host "按 Enter 开始截图"

$screenshots = @(
    @{ FileName = "01_login_dark"; Description = "登录页面 - 深色模式" },
    @{ FileName = "02_login_light"; Description = "登录页面 - 点击主题切换按钮切换到浅色模式" },
    @{ FileName = "03_login_form"; Description = "登录表单 - 输入账号 admin，密码 admin123" },
    @{ FileName = "04_dashboard"; Description = "登录成功后首页概览" },
    @{ FileName = "05_user_mgmt"; Description = "点击侧边栏用户管理" },
    @{ FileName = "06_user_add"; Description = "点击新增用户按钮，显示弹窗" },
    @{ FileName = "07_dept"; Description = "点击部门架构" },
    @{ FileName = "08_role"; Description = "点击角色权限" },
    @{ FileName = "09_logout"; Description = "点击用户名显示退出菜单" }
)

foreach ($shot in $screenshots) {
    Capture-BrowserWindow -FileName $shot.FileName -Description $shot.Description
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  截图完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "截图保存在: $OutputDir" -ForegroundColor Yellow

Read-Host "按 Enter 退出"
