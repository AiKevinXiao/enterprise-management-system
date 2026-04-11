import subprocess
import os
import time
import sys
from PIL import Image

def capture_screen(filename, description, delay=3):
    """使用 PowerShell 截取主屏"""
    print(f"\n[{filename}] {description}")
    print(f"请在 {delay} 秒内切换到浏览器窗口...")
    
    for i in range(delay, 0, -1):
        print(f"{i}...", end="", flush=True)
        time.sleep(1)
    print("截图!")
    
    # PowerShell 脚本截取主屏
    ps_script = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$targetScreen = $screens[0]
$bounds = $targetScreen.Bounds

$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("{filename}")
$graphics.Dispose()
$bitmap.Dispose()
'''
    
    result = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print(f"已保存: {filename}")
        return True
    else:
        print(f"错误: {result.stderr}")
        return False

def create_gif(image_folder, output_file, duration=2000):
    """将图片合成为 GIF"""
    print("\n正在生成 GIF...")
    
    image_files = sorted([f for f in os.listdir(image_folder) if f.endswith('.png')])
    
    if not image_files:
        print("没有找到图片!")
        return
    
    images = []
    for filename in image_files:
        filepath = os.path.join(image_folder, filename)
        img = Image.open(filepath)
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        images.append(img)
    
    if images:
        images[0].save(
            output_file,
            save_all=True,
            append_images=images[1:],
            duration=duration,
            loop=0,
            optimize=True
        )
        print(f"GIF 已保存: {output_file}")
        print(f"总帧数: {len(images)}")

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 50)
    print("企业管理系统演示截图工具")
    print("=" * 50)
    print("\n请确保浏览器已打开 http://localhost:8888/login.html")
    print("5秒后开始截图...")
    time.sleep(5)
    
    screenshots = [
        ("01_login_dark.png", "登录页面 - 深色模式"),
        ("02_login_light.png", "登录页面 - 点击主题切换"),
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
        capture_screen(filepath, desc, delay=3)
        time.sleep(0.5)
    
    # 生成 GIF
    gif_path = r"E:\AI Project\企业管理系统\demo.gif"
    create_gif(output_dir, gif_path, duration=2000)
    
    print("\n" + "=" * 50)
    print("完成!")
    print("=" * 50)
    print(f"\n截图: {output_dir}")
    print(f"GIF: {gif_path}")

if __name__ == "__main__":
    main()
