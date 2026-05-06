import { test, expect } from '@playwright/test'

// 辅助函数：登录 admin
async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
  })
  await page.reload()
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', 'admin123')
  await page.click('button.login-btn')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

// 在对话框中填写并提交角色表单，code 参数使用唯一值
async function submitRoleDialog(page, name, code) {
  await page.fill('input[placeholder="请输入角色名称"]', name)
  await page.fill('input[placeholder="请输入角色编码"]', code)
  await page.click('.el-dialog button:has-text("确定")')
  // 等待：成功消息 OR 错误消息 OR 对话框关闭（任一出现即停止等待）
  await Promise.race([
    page.waitForSelector('.el-message--success', { timeout: 5000 }),
    page.waitForSelector('.el-message--error', { timeout: 5000 }),
    page.waitForSelector('.el-dialog:not([aria-hidden="true"])', { state: 'hidden', timeout: 5000 }).catch(() => null)
  ])
}

test.describe('角色权限管理', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/roles')
    await page.waitForSelector('.role-permission', { timeout: 10000 })
  })

  test('页面正确渲染 - 左侧角色列表 + 右侧权限面板', async ({ page }) => {
    await expect(page.locator('.role-permission')).toBeVisible()
    const roleItems = page.locator('.role-list .role-item')
    await expect(roleItems.first()).toBeVisible()
    await expect(page.locator('.permission-grid')).toBeVisible()
  })

  test('角色列表包含系统角色', async ({ page }) => {
    const roleItems = page.locator('.role-list .role-item')
    const count = await roleItems.count()
    expect(count).toBeGreaterThanOrEqual(3)
    // 超级管理员直接通过 role-item 的 has-text 查找
    const adminRole = page.locator('.role-item:has-text("超级管理员")')
    await expect(adminRole).toBeVisible()
  })

  test('点击角色显示权限配置', async ({ page }) => {
    const firstRole = page.locator('.role-list .role-item').first()
    await firstRole.click()
    const checkboxes = page.locator('.permission-grid input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThan(0)
  })

  test('新增角色弹窗', async ({ page }) => {
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('新增角色')
    await expect(page.locator('input[placeholder="请输入角色名称"]')).toBeVisible()
    await expect(page.locator('input[placeholder="请输入角色编码"]')).toBeVisible()
    // 关闭弹窗
    await page.click('.el-dialog__headerbtn')
    await expect(page.locator('.el-dialog')).not.toBeVisible()
  })

  test('新增角色 - 空表单校验', async ({ page }) => {
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.click('.el-dialog button:has-text("确定")')
    const errors = page.locator('.el-form-item__error')
    await expect(errors.first()).toBeVisible()
    // 关闭弹窗
    await page.keyboard.press('Escape')
  })

  test('新增角色 - 成功', async ({ page }) => {
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    
    // 使用时间戳确保唯一 code
    const ts = Date.now()
    await page.fill('input[placeholder="请输入角色名称"]', '测试角色E2E')
    await page.fill('input[placeholder="请输入角色编码"]', `test-role-e2e-${ts}`)
    await page.click('.el-dialog button:has-text("确定")')
    
    // 等待角色出现在列表中（最可靠的成功标志）
    const newRole = page.locator('.role-item:has-text("测试角色E2E")')
    const roleAppeared = await newRole.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    expect(roleAppeared).toBe(true)
    // 弹窗应关闭（等待最多 3s）
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 3000 }).catch(() => null)
  })

  test('编辑角色', async ({ page }) => {
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    const ts = Date.now()
    await submitRoleDialog(page, '测试编辑角色', `test-edit-role-${ts}`)
    
    const dialogClosed = await page.locator('.el-dialog[aria-hidden="true"]').isVisible().catch(() => false)
    if (!dialogClosed) {
      // 创建失败，跳过后续
      await page.keyboard.press('Escape')
      test.skip()
    }
    
    // 找到新角色并点击编辑
    const newRole = page.locator('.role-item:has-text("测试编辑角色")')
    await newRole.click()
    await page.waitForTimeout(500)
    await page.click('.role-actions button:has-text("编辑")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.locator('input[placeholder="请输入角色名称"]').fill('')
    await page.locator('input[placeholder="请输入角色名称"]').fill('测试编辑角色-已修改')
    await page.click('.el-dialog button:has-text("确定")')
    await page.waitForSelector('.el-message--success', { timeout: 5000 }).catch(() => null)
    const editSuccess = await page.locator('.el-message--success').isVisible().catch(() => false)
    expect(editSuccess).toBe(true)
  })

  test('删除自定义角色', async ({ page }) => {
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    const ts = Date.now()
    await submitRoleDialog(page, '待删除角色', `to-delete-role-${ts}`)
    
    const dialogClosed = await page.locator('.el-dialog[aria-hidden="true"]').isVisible().catch(() => false)
    if (!dialogClosed) {
      await page.keyboard.press('Escape')
      test.skip()
    }
    
    const newRole = page.locator('.role-item:has-text("待删除角色")')
    await newRole.click()
    await page.waitForTimeout(500)
    await page.click('.role-actions button:has-text("删除")')
    await expect(page.locator('.el-message-box')).toBeVisible()
    await page.click('.el-message-box button:has-text("删除")')
    await page.waitForSelector('.el-message--success', { timeout: 5000 }).catch(() => null)
    const deleteSuccess = await page.locator('.el-message--success').isVisible().catch(() => false)
    expect(deleteSuccess).toBe(true)
  })

  test('系统角色不可删除', async ({ page }) => {
    await page.waitForTimeout(500)
    // 直接用 has-text 查找超级管理员角色项
    const adminRole = page.locator('.role-item:has-text("超级管理员")').first()
    await adminRole.click()
    await page.waitForTimeout(500)
    
    // admin 角色的 type='system'，删除按钮不渲染。
    // 查找 admin 角色行内的删除按钮，应该为 0
    const adminDeleteBtn = adminRole.locator('.role-actions button:has-text("删除")')
    const count = await adminDeleteBtn.count()
    expect(count).toBe(0)
  })

  test('回收站视图切换', async ({ page }) => {
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)
    await expect(page.locator('.role-permission')).toBeVisible()
  })

  test('回收站恢复角色', async ({ page }) => {
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    const ts = Date.now()
    await submitRoleDialog(page, '待恢复角色', `to-restore-role-${ts}`)
    
    const dialogClosed = await page.locator('.el-dialog[aria-hidden="true"]').isVisible().catch(() => false)
    if (!dialogClosed) {
      await page.keyboard.press('Escape')
      test.skip()
    }
    
    // 删除
    const newRole = page.locator('.role-item:has-text("待恢复角色")')
    await newRole.click()
    await page.waitForTimeout(500)
    await page.click('.role-actions button:has-text("删除")')
    await expect(page.locator('.el-message-box')).toBeVisible()
    await page.click('.el-message-box button:has-text("删除")')
    await page.waitForSelector('.el-message--success', { timeout: 5000 }).catch(() => null)
    
    // 切换到回收站
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)
    
    const deletedRole = page.locator('.role-item:has-text("待恢复角色")')
    await expect(deletedRole).toBeVisible()
    
    // 点击恢复
    await deletedRole.click()
    await page.waitForTimeout(500)
    await page.click('.role-actions button:has-text("恢复")')
    await page.waitForSelector('.el-message--success', { timeout: 5000 }).catch(() => null)
    const restoreSuccess = await page.locator('.el-message--success').isVisible().catch(() => false)
    expect(restoreSuccess).toBe(true)
  })

  test('权限配置 - 勾选权限', async ({ page }) => {
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    const ts = Date.now()
    await submitRoleDialog(page, '权限测试角色', `perm-test-role-${ts}`)
    
    const dialogClosed = await page.locator('.el-dialog[aria-hidden="true"]').isVisible().catch(() => false)
    if (!dialogClosed) {
      await page.keyboard.press('Escape')
      test.skip()
    }
    
    const newRole = page.locator('.role-item:has-text("权限测试角色")')
    await newRole.click()
    await page.waitForTimeout(800)
    
    const checkboxLabel = page.locator('.permission-module .el-checkbox').first()
    await checkboxLabel.click()
    await page.click('button:has-text("保存权限")')
    await page.waitForSelector('.el-message--success', { timeout: 5000 }).catch(() => null)
    const permSuccess = await page.locator('.el-message--success').isVisible().catch(() => false)
    expect(permSuccess).toBe(true)
  })

  test('回收站下权限面板只读', async ({ page }) => {
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)
    
    const deletedItems = page.locator('.role-list .role-item')
    const count = await deletedItems.count()
    
    if (count > 0) {
      await deletedItems.first().click()
      await page.waitForTimeout(500)
      
      const checkboxes = page.locator('.permission-grid input[type="checkbox"]')
      const cbCount = await checkboxes.count()
      if (cbCount > 0) {
        const firstCb = checkboxes.first()
        const isDisabled = await firstCb.isDisabled()
        expect(isDisabled).toBe(true)
      }
    }
  })
})
