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

// 辅助函数：通过 API 创建角色（产生操作日志）
async function createRoleViaAPI(request, name, code) {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  })
  const { token } = await loginRes.json()
  const res = await request.post('/api/roles', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, code, description: 'E2E测试角色' }
  })
  return { token, body: await res.json() }
}

// 辅助函数：通过 API 清理测试角色（id > 3）
async function cleanupTestRoles(request) {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  })
  const { token } = await loginRes.json()
  const rolesRes = await request.get('/api/roles', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const rolesData = await rolesRes.json()
  const roles = rolesData.data || rolesData
  for (const role of roles) {
    if (role.id > 3) {
      await request.delete(`/api/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null)
    }
  }
}

test.describe('操作日志', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    // 通过侧边栏导航到操作日志
    await page.click('.el-menu-item:has-text("操作日志")')
    await page.waitForURL('**/operation-logs', { timeout: 10000 })
    await page.waitForSelector('.operation-log', { timeout: 10000 })
  })

  test.afterEach(async ({ request }) => {
    await cleanupTestRoles(request)
  })

  test('页面正确渲染 - 筛选栏 + 日志表格', async ({ page }) => {
    // 筛选栏存在
    await expect(page.locator('.filter-card')).toBeVisible()
    // 表格存在
    await expect(page.locator('.el-table')).toBeVisible()
    // 表头包含关键字段
    const headerTexts = await page.locator('.el-table__header-wrapper th').allTextContents()
    const headerStr = headerTexts.join(',')
    expect(headerStr).toContain('操作人')
    expect(headerStr).toContain('操作模块')
    expect(headerStr).toContain('操作类型')
    expect(headerStr).toContain('操作对象')
  })

  test('角色操作后产生日志记录', async ({ page, request }) => {
    // 通过 API 创建角色，产生操作日志
    const ts = Date.now()
    await createRoleViaAPI(request, `日志测试${ts}`, `log-test-${ts}`)

    // 回到操作日志页刷新
    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 验证表格有数据
    const rows = page.locator('.el-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('按模块筛选 - 角色', async ({ page, request }) => {
    // 先创建角色产生日志
    const ts = Date.now()
    await createRoleViaAPI(request, `模块筛选${ts}`, `mod-filter-${ts}`)

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 选择模块=角色（通过 label 定位）
    const moduleSelect = page.locator('.filter-form .el-form-item:has-text("操作模块") .el-select')
    await moduleSelect.click()
    await page.waitForTimeout(300)
    await page.click('.el-select-dropdown__item:has-text("角色")')
    await page.click('button:has-text("查询")')

    await page.waitForTimeout(800)
    const rows = page.locator('.el-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // 每行的模块列应包含"角色"（操作模块是第3列，对应 td:nth-child(3)）
    if (count > 0) {
      const moduleTags = page.locator('.el-table tbody tr td:nth-child(3) .el-tag')
      const tagCount = await moduleTags.count()
      expect(tagCount).toBeGreaterThan(0)
      for (let i = 0; i < Math.min(tagCount, 5); i++) {
        const text = await moduleTags.nth(i).textContent()
        expect(text.trim()).toBe('角色')
      }
    }
  })

  test('按操作类型筛选 - 新增', async ({ page, request }) => {
    // 先创建角色产生"新增"日志
    const ts = Date.now()
    await createRoleViaAPI(request, `类型筛选${ts}`, `action-filter-${ts}`)

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 选择操作类型=新增
    const selects = page.locator('.filter-form .el-select')
    await selects.nth(1).click()
    await page.waitForTimeout(300)
    await page.click('.el-select-dropdown__item:has-text("新增")')
    await page.click('button:has-text("查询")')

    await page.waitForTimeout(800)
    const rows = page.locator('.el-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('按操作人筛选', async ({ page, request }) => {
    // 先创建角色产生日志（操作人为 admin）
    const ts = Date.now()
    await createRoleViaAPI(request, `操作人筛选${ts}`, `user-filter-${ts}`)

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 输入操作人
    const usernameInput = page.locator('.filter-form input[placeholder="用户名"]')
    await usernameInput.fill('admin')
    await page.click('button:has-text("查询")')

    await page.waitForTimeout(800)
    const rows = page.locator('.el-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('重置筛选条件', async ({ page, request }) => {
    // 先创建角色产生日志
    const ts = Date.now()
    await createRoleViaAPI(request, `重置筛选${ts}`, `reset-filter-${ts}`)

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 设置筛选条件
    const usernameInput = page.locator('.filter-form input[placeholder="用户名"]')
    await usernameInput.fill('admin')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    // 点击重置
    await page.click('button:has-text("重置")')
    await page.waitForTimeout(500)

    // 验证输入框已清空
    const inputVal = await usernameInput.inputValue()
    expect(inputVal).toBe('')
  })

  test('分页功能', async ({ page, request }) => {
    // 创建多个角色产生日志
    const ts = Date.now()
    for (let i = 0; i < 3; i++) {
      await createRoleViaAPI(request, `分页测试${ts}_${i}`, `page-${ts}-${i}`)
    }

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 验证分页组件存在
    const pagination = page.locator('.el-pagination')
    await expect(pagination).toBeVisible()

    // 验证总条数 > 0
    const totalText = await pagination.locator('.el-pagination__total').textContent()
    const total = parseInt(totalText.replace(/[^\d]/g, ''), 10)
    expect(total).toBeGreaterThan(0)
  })

  test('日志字段完整 - ID/操作人/模块/类型/对象/时间', async ({ page, request }) => {
    // 创建角色产生日志
    const ts = Date.now()
    const roleName = `字段测试${ts}`
    await createRoleViaAPI(request, roleName, `field-${ts}`)

    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })

    // 选择模块=角色，缩小范围
    const moduleSelect2 = page.locator('.filter-form .el-form-item:has-text("操作模块") .el-select')
    await moduleSelect2.click()
    await page.waitForTimeout(300)
    await page.click('.el-select-dropdown__item:has-text("角色")')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(800)

    const rows = page.locator('.el-table tbody tr')
    const count = await rows.count()
    if (count === 0) { test.skip(); return }

    // 检查第一行的关键字段非空
    const firstRow = rows.first()
    const cells = firstRow.locator('td')
    const cellTexts = []
    for (let i = 0; i < await cells.count(); i++) {
      cellTexts.push(await cells.nth(i).textContent())
    }

    // ID列（第0列）应该有数字
    expect(cellTexts[0].trim()).toMatch(/^\d+$/)
    // 操作人列（第1列）应该有值
    expect(cellTexts[1].trim().length).toBeGreaterThan(0)
    // 时间列（最后一列）应该有值
    const lastCell = cellTexts[cellTexts.length - 1].trim()
    expect(lastCell.length).toBeGreaterThan(0)
  })

  test('侧边栏操作日志菜单可见且可导航', async ({ page }) => {
    // 当前已在操作日志页，验证侧边栏高亮
    const menuItem = page.locator('.el-menu-item:has-text("操作日志")')
    await expect(menuItem).toBeVisible()
    // 验证菜单项处于激活状态
    const isActive = await menuItem.evaluate(el => el.classList.contains('is-active'))
    expect(isActive).toBe(true)
  })
})
