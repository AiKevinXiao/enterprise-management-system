import subprocess
import os
import time

def capture_screenshot(filename, delay=5):
    """截图指定屏幕"""
    print(f"\nCapturing in {delay} seconds...")
    for i in range(delay, 0, -1):
        print(f"{i}...", end="", flush=True)
        time.sleep(1)
    print("Capture!")
    
    ps_script = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::AllScreens[0]
$bounds = $screen.Bounds
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
        print(f"Saved: {os.path.basename(filename)}")
        return True
    else:
        print(f"Error: {result.stderr}")
        return False

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("="*50)
    print("Enterprise Management System Screenshot Tool")
    print("="*50)
    print("\nSteps to capture:")
    print("1. Open Edge at http://localhost:8888/login.html")
    print("2. Put browser on primary screen")
    print("3. This tool will auto-capture with 5s delay between steps")
    print("")
    
    # Wait for user to prepare
    print("Starting in 10 seconds... Prepare your browser now!")
    time.sleep(10)
    
    screenshots = [
        ("01_login_dark.png", "Login - Dark Mode"),
        ("02_login_light.png", "Login - Light Mode (click sun icon)"),
        ("03_login_input.png", "Login - Enter admin/admin123"),
        ("04_login_submit.png", "Login - Click submit"),
        ("05_dashboard.png", "Dashboard loaded"),
        ("06_user_mgmt.png", "User Management page"),
        ("07_user_add_modal.png", "Add User modal open"),
        ("08_dept.png", "Department page"),
        ("09_role.png", "Role Permission page"),
        ("10_user_menu.png", "User menu opened"),
    ]
    
    for filename, desc in screenshots:
        print(f"\n[{desc}]")
        filepath = os.path.join(output_dir, filename)
        capture_screenshot(filepath, delay=5)
    
    print("\n" + "="*50)
    print("All screenshots completed!")
    print("="*50)
    print(f"\nSaved to: {output_dir}")

if __name__ == "__main__":
    main()
