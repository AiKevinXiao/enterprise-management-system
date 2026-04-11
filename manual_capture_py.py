import subprocess
import os
import time

def capture_step(step_num, filename, description, action):
    """手动步骤截图"""
    print("\n" + "="*50)
    print(f"Step {step_num}: {description}")
    print("="*50)
    print(f"\nAction: {action}")
    input("\nPress Enter to capture screenshot...")
    
    # PowerShell 截图
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
        print(f"✓ Saved: {os.path.basename(filename)}")
    else:
        print(f"Error: {result.stderr}")

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("="*50)
    print("Enterprise Management System")
    print("Manual Screenshot Tool")
    print("="*50)
    print("\nPrerequisites:")
    print("  1. Open Edge browser")
    print("  2. Go to http://localhost:8888/login.html")
    print("  3. Put browser on primary screen")
    print("")
    input("Press Enter when ready...")
    
    steps = [
        ("1", "01_login_dark.png", "Login Page - Dark Mode", "Ensure login page is displayed in dark mode"),
        ("2", "02_login_light.png", "Login Page - Light Mode", "Click theme toggle button (sun icon)"),
        ("3", "03_login_input.png", "Login Form", "Type username: admin, password: admin123"),
        ("4", "04_login_submit.png", "Login Submit", "Click login button"),
        ("5", "05_dashboard.png", "Dashboard", "Wait for dashboard to load"),
        ("6", "06_user_mgmt.png", "User Management", "Click [User Management] in left sidebar"),
        ("7", "07_user_add_modal.png", "Add User Modal", "Click [+ Add User] button"),
        ("8", "08_dept.png", "Department", "Close modal, click [Department]"),
        ("9", "09_role.png", "Role Permission", "Click [Role Permission]"),
        ("10", "10_user_menu.png", "User Menu", "Click username to show logout menu"),
    ]
    
    for step_num, filename, desc, action in steps:
        filepath = os.path.join(output_dir, filename)
        capture_step(step_num, filepath, desc, action)
    
    print("\n" + "="*50)
    print("All screenshots completed!")
    print("="*50)
    print(f"\nSaved to: {output_dir}")
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
