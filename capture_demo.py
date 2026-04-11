import subprocess
import os
import time

def capture_screen(filename, description, delay=3):
    """使用 PowerShell 截取屏幕"""
    print(f"\n[{filename}] {description}")
    print(f"请在 {delay} 秒内切换到浏览器窗口（副屏）...")
    
    for i in range(delay, 0, -1):
        print(f"{i}...", end="", flush=True)
        time.sleep(1)
    print("截图!")
    
    # PowerShell 脚本截取活动窗口
    ps_script = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 获取活动窗口位置
$sig = @'
[DllImport("user32.dll")]
public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
[DllImport("user32.dll")]
public static extern IntPtr GetForegroundWindow();
[StructLayout(LayoutKind.Sequential)]
public struct RECT {{ public int Left, Top, Right, Bottom; }}
'@

$type = Add-Type -MemberDefinition $sig -Name WinAPI -PassThru
$hwnd = $type::GetForegroundWindow()
$rect = New-Object $type+RECT
$type::GetWindowRect($hwnd, [ref]$rect)

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

# 如果窗口太小，使用第二个屏幕
if ($width -lt 800 -or $height -lt 600) {{
    $screen = [System.Windows.Forms.Screen]::AllScreens[1]
    $bounds = $screen.Bounds
}} else {{
    $bounds = New-Object System.Drawing.Rectangle($rect.Left, $rect.Top, $width, $height)
}}

$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("{filename}")
$graphics.Dispose()
$bitmap.Dispose()
'''
    
    # 执行 PowerShell
    result = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print(f"已保存: {filename}")
    else:
        print(f"错误: {result.stderr}")
    
    return result.returncode == 0

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 50)
    print("  企业管理系统演示截图工具")
    print("=" * 50)
    print()
    print("请确保:")
    print("  1. Edge 浏览器已打开 http://localhost:8888/login.html")
    print("  2. 浏览器窗口在副屏上")
    print("  3. 每次截图前将浏览器设为活动窗口")
    print()
    input("按 Enter 开始截图...")
    
    screenshots = [
        ("01_login_dark.png", "登录页面 - 深色模式"),
        ("02_login_light.png", "登录页面 - 点击主题切换按钮"),
        ("03_login_form.png", "登录表单 - 输入账号密码"),
        ("04_dashboard.png", "登录成功后首页概览"),
        ("05_user_mgmt.png", "用户管理页面"),
        ("06_user_add.png", "新增用户弹窗"),
        ("07_dept.png", "部门架构页面"),
        ("08_role.png", "角色权限页面"),
        ("09_logout.png", "退出登录菜单"),
    ]
    
    for filename, desc in screenshots:
        filepath = os.path.join(output_dir, filename)
        capture_screen(filepath, desc)
    
    print()
    print("=" * 50)
    print("  截图完成!")
    print("=" * 50)
    print(f"\n截图保存在: {output_dir}")
    input("\n按 Enter 退出...")

if __name__ == "__main__":
    main()
