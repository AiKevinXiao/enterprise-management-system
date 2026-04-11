import subprocess
import os
import time
import sys

# 设置编码
sys.stdout.reconfigure(encoding='utf-8')

def capture_screen(filename, description, delay=3):
    """使用 PowerShell 截取屏幕"""
    print(f"\n[{filename}] {description}")
    print(f"Waiting {delay} seconds to switch to browser...")
    
    for i in range(delay, 0, -1):
        print(f"{i}...", end="", flush=True)
        time.sleep(1)
    print("Capture!")
    
    # PowerShell 脚本截取活动窗口
    ps_script = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 获取所有屏幕
$screens = [System.Windows.Forms.Screen]::AllScreens
Write-Host "Found $($screens.Count) screens"

# 使用第一个屏幕（主屏）
$targetScreen = $screens[0]
Write-Host "Using primary screen: $($targetScreen.DeviceName)"

$bounds = $targetScreen.Bounds
Write-Host "Capture area: $($bounds.Width) x $($bounds.Height)"

$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("{filename}")
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Saved: {filename}"
'''
    
    # 执行 PowerShell
    result = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(f"Error: {result.stderr}")
    
    return result.returncode == 0

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 50)
    print("Enterprise Management System Demo Capture")
    print("=" * 50)
    print()
    print("Make sure Edge browser is open on SECOND screen")
    print("at: http://localhost:8888/login.html")
    print()
    
    # Wait 5 seconds for user to prepare
    print("Starting in 5 seconds...")
    time.sleep(5)
    
    screenshots = [
        ("01_login_dark.png", "Login page - Dark mode"),
        ("02_login_light.png", "Login page - Click theme toggle"),
        ("03_login_form.png", "Login form with credentials"),
        ("04_dashboard.png", "Dashboard after login"),
        ("05_user_mgmt.png", "User Management page"),
        ("06_user_add.png", "Add User modal"),
        ("07_dept.png", "Department page"),
        ("08_role.png", "Role Permission page"),
        ("09_logout.png", "Logout menu"),
    ]
    
    for filename, desc in screenshots:
        filepath = os.path.join(output_dir, filename)
        capture_screen(filepath, desc, delay=3)
        time.sleep(0.5)  # Brief pause between shots
    
    print()
    print("=" * 50)
    print("Capture Complete!")
    print("=" * 50)
    print(f"\nScreenshots saved to: {output_dir}")

if __name__ == "__main__":
    main()
