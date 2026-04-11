"""
Enterprise Management System - Automated Screenshot Tool
Uses browser CDP to control Edge and capture screenshots
"""

import sys
import os
import time
import subprocess

# Auto-install websockets if missing
import importlib.util
if importlib.util.find_spec('websockets') is None:
    print("Installing websockets...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websockets', '-q'])

# Add skill path
skill_path = r'D:\Program Files\QClaw\resources\openclaw\config\skills\browser-cdp\scripts'
sys.path.insert(0, skill_path)

from browser_launcher import BrowserLauncher, BrowserNeedsCDPError
from cdp_client import CDPClient
from browser_actions import BrowserActions

def main():
    output_dir = r"E:\AI Project\企业管理系统\demo-gif"
    os.makedirs(output_dir, exist_ok=True)
    
    print("="*50)
    print("Enterprise Management System")
    print("Automated Screenshot Tool")
    print("="*50)
    print()
    
    # Launch browser with isolated profile and maximize
    print("Starting Edge browser...")
    launcher = BrowserLauncher()
    try:
        cdp_url = launcher.launch(browser='edge', reuse_profile=False, window_size='maximized')
    except BrowserNeedsCDPError as e:
        print(f"Error: {e}")
        return
    
    client = CDPClient(cdp_url)
    client.connect()
    
    # Find existing tab or create new
    tabs = client.list_tabs()
    target_tab = None
    for tab in tabs:
        if 'localhost:8888' in tab.get('url', ''):
            target_tab = tab
            break
    
    if target_tab:
        client.attach(target_tab['id'])
        print("Attached to existing tab")
    else:
        tab = client.create_tab('http://localhost:8888/login.html')
        client.attach(tab['id'])
        print("Created new tab")
    
    # Maximize window
    print("Maximizing window...")
    try:
        client.send('Browser.setWindowBounds', {
            'windowId': 1,
            'bounds': {'windowState': 'maximized'}
        })
    except:
        pass
    
    actions = BrowserActions(client, None)
    actions.wait_for_load()
    
    # Navigate to login page
    print("Navigating to login page...")
    actions.navigate('http://localhost:8888/login.html')
    actions.wait_for_load()
    time.sleep(2)
    
    print("\nStarting automated capture...")
    print("Browser will be controlled automatically")
    print()
    
    # Step 1: Login page dark mode
    print("[1/10] Login page - Dark mode")
    actions.screenshot(os.path.join(output_dir, '01_login_dark.png'))
    time.sleep(1)
    
    # Step 2: Enter credentials
    print("[2/10] Entering credentials...")
    try:
        actions.evaluate("document.getElementById('username').value = 'admin'")
        actions.evaluate("document.getElementById('password').value = 'admin123'")
    except:
        pass
    time.sleep(0.5)
    actions.screenshot(os.path.join(output_dir, '02_login_input.png'))
    time.sleep(1)
    
    # Step 3: Submit login
    print("[3/10] Submitting login...")
    try:
        actions.evaluate("document.getElementById('loginForm').dispatchEvent(new Event('submit'))")
    except:
        pass
    time.sleep(2)
    actions.screenshot(os.path.join(output_dir, '03_login_submit.png'))
    time.sleep(2)
    
    # Step 4: Dashboard (dark mode)
    print("[4/10] Dashboard - Dark mode")
    actions.navigate('http://localhost:8888/dashboard.html')
    actions.wait_for_load()
    time.sleep(2)
    actions.screenshot(os.path.join(output_dir, '04_dashboard_dark.png'))
    time.sleep(1)
    
    # Step 5: Switch to light mode
    print("[5/10] Switching to light mode...")
    try:
        actions.evaluate("toggleTheme()")
    except:
        pass
    time.sleep(1)
    actions.screenshot(os.path.join(output_dir, '05_dashboard_light.png'))
    time.sleep(1)
    
    # Step 6: User Management
    print("[6/10] Navigating to User Management...")
    actions.navigate('http://localhost:8888/user-management.html')
    actions.wait_for_load()
    time.sleep(2)
    actions.screenshot(os.path.join(output_dir, '06_user_mgmt.png'))
    time.sleep(1)

    # Step 7: Open Add User modal
    print("[7/10] Opening Add User modal...")
    try:
        actions.evaluate("openModal('add')")
    except:
        pass
    time.sleep(1)
    actions.screenshot(os.path.join(output_dir, '07_user_add_modal.png'))
    time.sleep(1)

    # Step 8: Department
    print("[8/10] Navigating to Department...")
    actions.navigate('http://localhost:8888/department.html')
    actions.wait_for_load()
    time.sleep(2)
    actions.screenshot(os.path.join(output_dir, '08_dept.png'))
    time.sleep(1)

    # Step 9: Role Permission
    print("[9/10] Navigating to Role Permission...")
    actions.navigate('http://localhost:8888/role-permission.html')
    actions.wait_for_load()
    time.sleep(2)
    actions.screenshot(os.path.join(output_dir, '09_role.png'))
    time.sleep(1)

    # Step 10: User menu
    print("[10/10] Opening user menu...")
    try:
        actions.evaluate("showLogoutMenu()")
    except:
        pass
    time.sleep(1)
    actions.screenshot(os.path.join(output_dir, '10_user_menu.png'))
    
    print()
    print("="*50)
    print("All screenshots completed!")
    print("="*50)
    print(f"\nSaved to: {output_dir}")

if __name__ == "__main__":
    main()
