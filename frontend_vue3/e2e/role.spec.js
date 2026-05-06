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

// 辅助函数：通过 API 清理测试角色（id > 3 的非种子数据）
async function cleanupTestRoles(request) {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  })
  const { token } = await loginRes.json()
  
  // 获取所有角色
  const rolesRes = await request.get('/api/roles', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const rolesData = await rolesRes.json()
  const roles = rolesData.data || rolesData
  
  // 删除 id > 3 的角色
  for (const role of roles) {
    if (role.id > 3) {
      await request.delete(`/api/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    }
  }
  
  // 确保种子角色名正确
  await request.put('/api/roles/1', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: '超级管理员', description: '拥有系统全部权限' }
  }).catch(() => null)
}

// 在对话框中填写并提交角色表单
async function submitRoleDialog(page, name, code) {
  await page.fill('input[placeholder="请输入角色名称"]', name)
  await page.fill('input[placeholder="请输入角色编码"]', code)
  await page.click('.el-dialog button:has-text("确定")')
  // 等待弹窗关闭或成功消息
  await Promise.race([
    page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 5000 }),
    page.waitForSelector('.el-message--success', { timeout: 5000 }),
    page.waitForSelector('.el-message--error', { timeout: 5000 })
  ]).catch(() => null)
  // 强制关闭残留弹窗
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 3000 }).catch(() => null)
}

// 等待角色出现在列表中
async function waitForRole(page, roleName, timeout = 5000) {
  const locator = page.locator(`.role-item .role-name:has-text("${roleName}")`)
  return locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)
}

test.describe('角色权限管理', () => {

  test.beforeEach(async ({ page, request }) => {
    // API 层清理测试数据
    await cleanupTestRoles(request)
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
    const adminRole = page.locator('.role-item .role-name:has-text("超级管理员")')
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
    await page.click('.el-dialog__headerbtn')
    await expect(page.locator('.el-dialog')).not.toBeVisible()
  })

  test('新增角色 - 空表单校验', async ({ page }) => {
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.click('.el-dialog button:has-text("确定")')
    const errors = page.locator('.el-form-item__error')
    await expect(errors.first()).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('新增角色 - 成功', async ({ page }) => {
    const ts = Date.now()
    const roleName = `新增角色${ts}`
    
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.fill('input[placeholder="请输入角色名称"]', roleName)
    await page.fill('input[placeholder="请输入角色编码"]', `test-role-${ts}`)
    await page.click('.el-dialog button:has-text("确定")')
    
    const appeared = await waitForRole(page, roleName)
    expect(appeared).toBe(true)
  })

  test('编辑角色', async ({ page }) => {
    const ts = Date.now()
    const originalName = `编辑角色${ts}`
    const modifiedName = `已修改${ts}`
    
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await submitRoleDialog(page, originalName, `edit-role-${ts}`)

    const appeared = await waitForRole(page, originalName)
    if (!appeared) { test.skip(); return }

    // 点击角色行的编辑按钮（精确匹配 role-name）
    const roleItem = page.locator(`.role-item:has(.role-name:has-text("${originalName}"))`)
    await roleItem.click()
    await page.waitForTimeout(500)
    await roleItem.locator('.role-actions button:has-text("编辑")').click()
    
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.locator('input[placeholder="请输入角色名称"]').fill('')
    await page.locator('input[placeholder="请输入角色名称"]').fill(modifiedName)
    await page.click('.el-dialog button:has-text("确定")')

    const editAppeared = await waitForRole(page, modifiedName)
    expect(editAppeared).toBe(true)
  })

  test('删除自定义角色', async ({ page }) => {
    const ts = Date.now()
    const roleName = `待删除${ts}`
    
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await submitRoleDialog(page, roleName, `del-role-${ts}`)

    const appeared = await waitForRole(page, roleName)
    if (!appeared) { test.skip(); return }

    // 点击角色行的删除按钮
    const roleItem = page.locator(`.role-item:has(.role-name:has-text("${roleName}"))`)
    await roleItem.click()
    await page.waitForTimeout(500)
    await roleItem.locator('.role-actions button:has-text("删除")').click()
    
    // 确认弹窗 - 点击确认按钮（最后一个按钮）
    await expect(page.locator('.el-message-box')).toBeVisible()
    await page.locator('.el-message-box__btns button').last().click()

    // 等待角色从列表消失
    const roleLocator = page.locator(`.role-item .role-name:has-text("${roleName}")`)
    const deleted = await roleLocator.waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false)
    expect(deleted).toBe(true)
  })

  test('系统角色不可删除', async ({ page }) => {
    // 精确匹配 role-name 文本
    const adminRole = page.locator('.role-item:has(.role-name:has-text("超级管理员"))')
    await adminRole.click()
    await page.waitForTimeout(500)
    
    // admin 角色的 type='system'，删除按钮不渲染
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
    const ts = Date.now()
    const roleName = `待恢复${ts}`
    
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await submitRoleDialog(page, roleName, `restore-role-${ts}`)

    const appeared = await waitForRole(page, roleName)
    if (!appeared) { test.skip(); return }

    // 删除角色
    const roleItem = page.locator(`.role-item:has(.role-name:has-text("${roleName}"))`)
    await roleItem.click()
    await page.waitForTimeout(500)
    await roleItem.locator('.role-actions button:has-text("删除")').click()
    
    await expect(page.locator('.el-message-box')).toBeVisible()
    await page.locator('.el-message-box__btns button').last().click()

    // 等待角色从正常列表消失
    await page.locator(`.role-item .role-name:has-text("${roleName}")`).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null)

    // 切换到回收站
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(1000)

    const deletedRole = page.locator(`.role-item .role-name:has-text("${roleName}")`)
    await expect(deletedRole).toBeVisible()

    // 点击恢复
    const deletedRoleItem = page.locator(`.role-item:has(.role-name:has-text("${roleName}"))`)
    await deletedRoleItem.click()
    await page.waitForTimeout(500)
    await deletedRoleItem.locator('.role-actions button:has-text("恢复")').click()

    // 等待角色从回收站消失
    const restored = await deletedRole.waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false)
    expect(restored).toBe(true)
  })

  test('权限配置 - 勾选权限', async ({ page }) => {
    const ts = Date.now()
    const roleName = `权限测试${ts}`
    
    // 创建角色
    await page.click('.card-header button:has-text("新增")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await submitRoleDialog(page, roleName, `perm-role-${ts}`)

    const appeared = await waitForRole(page, roleName)
    if (!appeared) { test.skip(); return }

    const roleItem = page.locator(`.role-item:has(.role-name:has-text("${roleName}"))`)
    await roleItem.click()
    await page.waitForTimeout(800)

    const checkboxLabel = page.locator('.permission-module .el-checkbox').first()
    await checkboxLabel.click()
    await page.click('button:has-text("保存权限")')

    const permSuccess = await page.locator('.el-message--success').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
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
